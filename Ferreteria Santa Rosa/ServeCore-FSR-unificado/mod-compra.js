/* ═══════════════════════════════════════════════════════════════
   Compras / Proveeduría — el ciclo completo de una compra:
   cotizar → orden → aprobación → recepción en bodega → registrar la
   compra contra el XML del proveedor → reparto a los locales.
   Proveedores: negociaciones, desempeño y estado de cuenta.

   Separación de funciones: quien compra (Proveeduría) no aprueba
   (Gerencia) ni recibe (Bodega); quien recibe no registra la factura.
   Cada paso firma en la bitácora con la persona de la sesión.
   Las cuentas por pagar y los pagos viven en Cobros y pagos.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, grp, c, dec, kg, fecha, icon, tag, card, stat, table, seg, onSeg, fichaCell, field,
    openSheet, closeSheet, toast, locNom, provNom, artOf, empty } = U;
  const IX = () => w.INVX || {};

  /* ══ POLÍTICA DE COMPRAS ═════════════════════════════════════
     Mismos valores que Sistema › Parámetros y Sistema › Autorizaciones:
     variación de costo ±15 % (COM-008) y tolerancia de precio contra la
     orden al registrar la factura. */
  const POL = { topeVar: 15, tolPrecio: 1 };

  /* quién hace cada paso */
  const ROL = {
    comprar: ["Proveeduría", "Gerencia"],
    aprobar: ["Gerencia"],
    anularAprobada: ["Gerencia"],
    autorizar: ["Gerencia"],
    recibir: ["Bodega", "Gerencia"],
    registrar: ["Proveeduría", "Contabilidad", "Gerencia"],
    repartir: ["Bodega", "Gerencia"]
  };
  const QUIEN = { "Proveeduría": "oscar", "Gerencia": "adrian", "Bodega": "kevin", "Contabilidad": "sonia" };
  const GENTE = { compra: "Óscar Jiménez Ureña", bodega: "Kevin Solano Mata", gerente: "Adrián Vindas Mora" };
  const puede = acc => D.puede.apply(null, ROL[acc]);
  function exige(acc, que) {
    if (puede(acc)) return true;
    toast("Esto no lo hace su rol", que + " lo hace " + ROL[acc].join(" o ") + ". Usted entró como " + D.sesion.cargo + ": cambie de usuario en el encabezado.", "cr");
    return false;
  }
  /* aviso de quién hace el paso, con atajo para cambiar de persona en la demo */
  function quienHace(acc) {
    if (puede(acc)) return "";
    const pid = QUIEN[ROL[acc][0]], p = D.PERSONAS.find(x => x.id === pid);
    return `<span class="sbh">Lo hace ${esc(ROL[acc].join(" o "))}</span>${p ? `<button class="btn sm" data-como="${p.id}">${icon("users")}Entrar como ${esc(p.corto)}</button>` : ""}`;
  }
  function wireComo(v) {
    $$("[data-como]", v).forEach(b => b.addEventListener("click", () => {
      const p = D.cambiarSesion(b.dataset.como);
      A.refresh();
      toast("Sesión de " + p.nom, p.cargo + " · lo que haga queda en la bitácora con su usuario.", "in");
    }));
  }

  /* bitácora: firma con la persona de la sesión; la orden guarda su propio historial */
  function anotar(accion, detalle, oc, antes, despues, sev) {
    const f = D.ahora();
    D.bitacora.unshift({
      id: "BT-C" + D.bitacora.length, fecha: f, usuario: D.sesion.nom, rol: D.sesion.rol, locId: oc ? oc.locId : "CD",
      accion, detalle, sev: sev || "Media", antes: antes || "", despues: despues || "", ip: D.sesion.ip
    });
    if (oc) (oc.hist = oc.hist || []).push({ f, quien: D.sesion.nom, acc: accion + (detalle ? " · " + detalle : "") });
  }

  /* ══ ESTADO DE CADA ORDEN ════════════════════════════════════
     Registrada = borrador (se edita o se elimina; no compromete nada) →
     Aprobada (firme ante el proveedor, se envía con QR; ya no se edita, solo se anula) →
     Recibida / Recibida parcial (bodega cerró la recepción) →
     Aplicada (la factura del proveedor se aplicó: entra inventario, cuenta por pagar y asiento) ·
     Anulada (con motivo). Aprobada NO es aplicada: aprobar compromete la compra; aplicar la registra.
     La etiqueta dice el estado y lo que sigue; la clave interna no cambia. */
  const EST = {
    "Registrada": ["Borrador", "mu"],
    "Aprobada": ["Aprobada · por recibir", "acc"],
    "Recibida": ["Recibida · falta la factura", "wa"],
    "Recibida parcial": ["Recibida con faltantes", "wa"],
    "Aplicada": ["Aplicada · cerrada", "ok"],
    "Anulada": ["Anulada", "cr"]
  };
  const estTag = oc => tag((EST[oc.estado] || [oc.estado])[0], (EST[oc.estado] || [0, "mu"])[1]);
  const recibida = oc => /^Recibida/.test(oc.estado);
  const abierta = oc => oc.estado !== "Aplicada" && oc.estado !== "Anulada";
  const esBodega = oc => { const l = D.locales.find(x => x.id === oc.locId); return !!l && l.tipo !== "tienda"; };
  const porRepartir = oc => oc.estado === "Aplicada" && oc.tipo !== "Autoconsumo" && esBodega(oc) && !oc.dist && !(oc.aplicada && oc.aplicada.seed);

  /* variación del costo de la línea contra el costo vigente del artículo */
  const varDe = l => { const a = artOf(l.artId); return a && a.costo ? Math.round(((l.costo / a.costo) - 1) * 1000) / 10 : 0; };
  const bloqueada = l => Math.abs(l.var) > POL.topeVar && !l.aut;
  const totales = oc => Object.assign(oc, D.totalesCompra(oc.lineas));

  /* unidad en que se compra (tarima, rollo, caja) y su factor */
  /* nombre corto del proveedor para listas y botones: sin «S.A.» ni «Costa Rica» */
  const provCorto = id => String((D.provById[id] || {}).nom || "—").replace(/,?\s+(S\.\s?A\.|C\.\s?R\.|S\.R\.L\.)$/i, "").replace(/\s+(de\s+)?Costa Rica$/i, "");
  const presC = a => (IX().presCompra ? IX().presCompra(a) : { u: a.unidad, f: 1 });
  const unid = a => String(a.unidad || "").toLowerCase();
  function cantTxt(n, a) {
    const p = presC(a);
    return `${grp(n)} <span class="dim">${esc(unid(a))}</span>` +
      (p.f > 1 && n >= p.f ? `<span class="sub">${n % p.f ? "≈ " : ""}${grp(Math.floor(n / p.f))} × ${esc(String(p.u).toLowerCase())}</span>` : "");
  }

  /* órdenes de la demo: se completan una vez con quién las hizo, su
     historial y, si ya pasaron por bodega, la recepción */
  function prepara(oc) {
    if (oc._prep) return oc;
    oc._prep = true;
    const p = D.provById[oc.provId] || {};
    oc.tipo = oc.tipo || "Reventa";
    oc.creadoPor = oc.creadoPor || GENTE.compra;
    oc.plazoPactado = oc.plazoPactado != null ? oc.plazoPactado : p.plazo;
    oc.neg = oc.neg || "N";
    oc.hist = oc.hist || [{ f: oc.fecha, quien: oc.creadoPor, acc: "Registró la orden" }];
    oc.pedido = oc.pedido || { sub: oc.sub, iva: oc.iva, total: oc.total };
    oc.lineas.forEach(l => { if (l.var == null) l.var = varDe(l); });
    if (oc.estado !== "Registrada" && oc.estado !== "Anulada" && !oc.aprobadoPor) {
      oc.aprobadoPor = GENTE.gerente;
      oc.hist.push({ f: oc.fecha, quien: GENTE.gerente, acc: "Aprobó la orden y se envió al proveedor" });
    }
    if ((oc.estado === "Aplicada" || recibida(oc)) && !oc.rec) {
      const parcial = oc.estado === "Recibida parcial", cant = {}, trato = {};
      oc.lineas.forEach((l, i) => { cant[l.artId] = parcial && i === 0 ? Math.round(l.cant * 0.85) : l.cant; });
      if (parcial) trato[oc.lineas[0].artId] = "pendiente";
      oc.rec = { cant, trato, extra: [], evid: { placa: "CL " + (180000 + oc.lineas.length * 7919 % 99999), transp: "Transporte del proveedor", sello: true, fotos: 1 }, cerrada: true, por: GENTE.bodega, fecha: oc.fecha, seed: true };
      oc.hist.push({ f: oc.fecha, quien: GENTE.bodega, acc: parcial ? "Cerró la recepción con faltantes" : "Cerró la recepción completa" });
    }
    if (oc.estado === "Aplicada" && !oc.aplicada) {
      oc.aplicada = { por: GENTE.compra, fecha: oc.fecha, seed: true };
      oc.hist.push({ f: oc.fecha, quien: GENTE.compra, acc: "Registró la compra" });
    }
    return oc;
  }
  const OCS = () => D.compras.map(prepara);
  /* una orden se encuentra por su consecutivo o por el número de borrador que tuvo antes de aprobarse
     (así no se rompen las referencias guardadas: cotizaciones, copias, selección) */
  const ocDe = cons => OCS().find(o => o.cons === cons || o.borrador === cons);
  /* cómo se lee el número: «Borrador 0412» mientras no tenga consecutivo; «OC 004431» después */
  const nomOC = cons => /^BOR-/.test(cons || "") ? "Borrador " + cons.slice(4) : String(cons || "").replace("OC-2026-", "OC ");
  function nuevaOC(provId, locId, items, estado) {
    const oc = prepara(D.crearOC(provId, locId, items, estado || "Registrada", D.ahora()));
    oc.creadoPor = D.sesion.nom;
    oc.hist = [{ f: D.ahora(), quien: D.sesion.nom, acc: "Registró la orden" }];
    oc.lineas.forEach(l => { l.var = varDe(l); });
    return oc;
  }

  /* ══ RECORRIDO DE LA ORDEN ═══════════════════════════════════
     El mismo en las tres pantallas: dónde está la orden, quién hizo
     cada paso y qué sigue. Cada paso lleva a su pantalla. */
  function recStats(oc) {
    const r = oc.rec || { cant: {} };
    let comp = 0, uni = 0, ped = 0;
    oc.lineas.forEach(l => { const x = r.cant[l.artId] || 0; if (x >= l.cant) comp++; uni += x; ped += l.cant; });
    return { comp, uni, ped, n: oc.lineas.length };
  }
  function pasos(oc) {
    const corto = n => String(n || "").split(" ").slice(0, 2).join(" ");
    const ap = oc.estado === "Anulada";
    const i = ap ? -1 : oc.estado === "Registrada" ? 1 : oc.estado === "Aprobada" ? 2 : recibida(oc) ? 3 : porRepartir(oc) ? 4 : 5;
    const rs = recStats(oc);
    const P = [
      { t: "Orden", s: corto(oc.creadoPor) + " · " + fecha(oc.fecha), go: "ordenes" },
      { t: "Aprobación", s: oc.aprobadoPor ? corto(oc.aprobadoPor) + " · quedó firme" : ap ? "Anulada" : "Falta · la deja firme", go: "ordenes" },
      { t: "Recepción", s: oc.rec && oc.rec.cerrada ? rs.comp + " de " + rs.n + " líneas completas" : oc.rec ? "En proceso · " + rs.comp + "/" + rs.n : "Bodega", go: "recepcion" },
      { t: "Factura aplicada", s: oc.aplicada ? (oc.aplicada.clave ? "FE …" + oc.aplicada.clave.slice(-6) : "Aplicada") : "Entra inventario y CxP", go: "registrar-compra" },
      { t: "Reparto", s: oc.dist ? (oc.dist.traslados && oc.dist.traslados.length ? oc.dist.traslados.length + " traslados" : "Todo queda") : esBodega(oc) && oc.tipo !== "Autoconsumo" ? "A los locales" : "No aplica", go: "recepcion" }
    ];
    return `<ol class="steps" aria-label="Recorrido de la orden">${P.map((x, k) => {
      const est = ap ? "" : k < i ? "done" : k === i ? "now" : "";
      return `<li><button type="button" class="step ${est}" data-paso="${x.go}|${esc(oc.cons)}" ${k === i ? 'aria-current="step"' : ""}>
        <span class="sn">${est === "done" ? icon("check") : k + 1}</span>
        <span class="st"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span></button></li>`;
    }).join("")}</ol>`;
  }
  /* la barra de «qué sigue»: una sola acción principal por estado */
  function siguiente(oc, aqui) {
    const bar = (t, s, btn, acc) => `<div class="stepbar"><div class="sbt"><b>${t}</b><span>${s}</span></div><div class="sba">${acc ? quienHace(acc) : ""}${btn || ""}</div></div>`;
    const ir = (scr, txt, ic) => `<button class="btn pri" data-paso="${scr}|${esc(oc.cons)}">${icon(ic || "chev")}${txt}</button>`;
    if (oc.estado === "Anulada") return bar("Orden anulada", esc((oc.anulada && oc.anulada.motivo) || "Sin motivo registrado") + (oc.anulada ? " · " + esc(oc.anulada.por) : ""), "");
    if (oc.estado === "Registrada") {
      const bl = oc.lineas.filter(bloqueada).length;
      return bar("Borrador · sigue aprobarla", bl ? bl + " línea" + (bl > 1 ? "s" : "") + " con el costo fuera de ±" + POL.topeVar + " %: corrija el costo o pida la autorización antes de aprobar." : oc.lineas.length ? "Mientras sea borrador se edita o se elimina y no compromete nada. Al aprobarla toma su consecutivo oficial, queda firme (ya no se edita, solo se anula) y se envía al proveedor con su QR." : "Agregue artículos: uno por uno, desde una plantilla o desde el sugerido de compra. Si no la va a usar, elimine el borrador.",
        aqui === "ordenes" ? `<button class="btn pri" id="ocAprobar" ${bl || !oc.lineas.length ? "disabled" : ""}>${icon("check")}Aprobar y enviar</button>` : ir("ordenes", "Ir a la orden"), "aprobar");
    }
    if (oc.estado === "Aprobada") return bar("Aprobada · sigue recibir en bodega", "Ya es firme ante el proveedor, pero todavía no es compra: el inventario y la cuenta por pagar entran cuando se aplica su factura. La bodega escanea la mercadería contra la orden (o el QR).", aqui === "recepcion" ? "" : ir("recepcion", "Recibir", "scan"), aqui === "recepcion" ? "recibir" : null);
    if (recibida(oc)) return bar("Sigue: registrar la compra", "Proveeduría coteja orden, recepción y factura electrónica del proveedor; lo que no cuadra se acepta parcial y se pide la nota de crédito.", aqui === "registrar-compra" ? "" : ir("registrar-compra", "Registrar compra", "file"), aqui === "registrar-compra" ? "registrar" : null);
    if (porRepartir(oc)) return bar("Sigue: repartir a los locales", "La mercadería entró a " + esc(locNom(oc.locId)) + ". El sugerido de cada tienda sale de sus mínimos y de lo que tiene.", aqui === "recepcion" ? "" : ir("recepcion", "Repartir", "route"), aqui === "recepcion" ? "repartir" : null);
    return bar("Orden cerrada", "Compra aplicada" + (oc.aplicada && oc.aplicada.por ? " por " + esc(oc.aplicada.por) : "") + (oc.backorder ? " · lo pendiente sigue en " + esc(oc.backorder) : "") + ".", "");
  }
  function wirePasos(v) {
    $$("[data-paso]", v).forEach(b => b.addEventListener("click", () => {
      const [scr, cons] = b.dataset.paso.split("|");
      A.go(scr, cons);
    }));
    wireComo(v);
  }

  /* lista de órdenes a la izquierda (bandeja) */
  function listaOC(rows, sel, o) {
    o = o || {};
    if (!rows.length) return empty("truck", o.vacioT || "Nada pendiente", o.vacioP || "Cuando haya órdenes en este paso aparecen aquí.");
    return `<div class="mitems">${rows.map(x => `
      <div style="display:flex;align-items:flex-start;gap:6px">
        ${o.check ? `<input type="checkbox" class="ocChk" value="${esc(x.cons)}" aria-label="Seleccionar ${esc(x.cons)}" ${o.check.indexOf(x.cons) >= 0 ? "checked" : ""} style="margin-top:14px">` : ""}
        <button class="mitem" style="flex:1;display:block;text-align:left" data-oc="${esc(x.cons)}" aria-selected="${x.cons === sel}">
          <span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="itd num" style="white-space:nowrap">${esc(nomOC(x.cons))}</span><b class="num" style="font-size:12.5px;white-space:nowrap">${grp(x.total)}</b></span>
          <span class="itc" style="display:block">${esc(provCorto(x.provId))} · ${esc(locNom(x.locId))}</span>
          <span class="itc" style="display:block">${x.lineas.length} líneas · ${fecha(x.fecha)}${x.origen ? " · de " + esc(nomOC((ocDe(x.origen) || {}).cons || x.origen)) : ""}</span>
          ${o.estado === false ? "" : `<span style="display:block;margin-top:5px">${estTag(x)}</span>`}
        </button></div>`).join("")}</div>`;
  }

  /* pitido del lector: tres tonos distintos para ok, cuidado y error */
  let AC = null;
  function pita(tipo) {
    try {
      AC = AC || new (w.AudioContext || w.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.value = tipo === "ok" ? 1320 : tipo === "wa" ? 660 : 220;
      g.gain.value = 0.06;
      o.connect(g); g.connect(AC.destination);
      o.start(); o.stop(AC.currentTime + (tipo === "cr" ? 0.35 : 0.09));
    } catch (e) { /* sin audio: queda el aviso visual */ }
  }

  /* busca un artículo por código interno, código de barras o descripción */
  function buscaArt(q) {
    const t = String(q || "").trim().toLowerCase();
    if (!t) return null;
    return D.articulos.find(a => a.cod.toLowerCase() === t || (a.ean && a.ean === t)) ||
      D.articulos.find(a => a.tipo !== "Servicio" && a.desc.toLowerCase().indexOf(t) >= 0) || null;
  }

  /* ══ BUSCADOR CON RESULTADOS AL DIGITAR ═══════════════════════
     Para listas que no caben en un combo (cientos de proveedores,
     16 000 artículos): se digita parte del nombre, código, cédula o
     código de barras y aparecen los resultados; flechas y Enter eligen. */
  const N = s => (U.norm ? U.norm(s) : String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  function resalta(text, q) {
    const t = N(q).split(/\s+/).filter(Boolean), n = N(text), hits = [];
    t.forEach(x => { const i = n.indexOf(x); if (i > -1) hits.push([i, i + x.length]); });
    if (!hits.length) return esc(text);
    hits.sort((a, b) => a[0] - b[0]);
    let out = "", cur = 0;
    hits.forEach(([a, b]) => { if (a < cur) return; out += esc(text.slice(cur, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>"; cur = b; });
    return out + esc(text.slice(cur));
  }
  function buscadorHTML(id, ph, o) {
    o = o || {};
    return `<div style="position:relative;${o.style || ""}"><div class="scan" style="margin:0">${icon(o.ic || "search")}<input id="${id}" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}L" aria-label="${esc(ph)}" placeholder="${esc(ph)}"></div>
      <div id="${id}L" role="listbox" style="position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:40"></div></div>`;
  }
  /* o: { buscar(q) → [{id,t,s,der}], elegir(item, texto), alVacio() → items para el campo vacío,
          enter(texto, item) → true si ya lo resolvió (lector de barras), vacio(q) → texto sin resultados } */
  function wireBuscador(root, id, o) {
    const inp = $("#" + id, root), box = $("#" + id + "L", root);
    if (!inp || !box) return;
    let sel = 0, res = [];
    const cierra = () => { box.innerHTML = ""; inp.setAttribute("aria-expanded", "false"); };
    const pinta = () => {
      const q = inp.value.trim();
      res = q ? o.buscar(q) : o.alVacio ? o.alVacio() : [];
      sel = Math.max(0, Math.min(sel, res.length - 1));
      if (!q && !res.length) return cierra();
      inp.setAttribute("aria-expanded", "true");
      box.innerHTML = `<div class="card" style="padding:4px;box-shadow:var(--shadow-lg);max-height:min(340px,50vh);overflow:auto">
        ${!q && o.tituloVacio ? `<div class="mut" style="font-size:11.5px;padding:6px 10px 2px;text-transform:uppercase;letter-spacing:.04em">${esc(o.tituloVacio)}</div>` : ""}
        ${res.length ? res.map((r, i) => `<button type="button" class="match ${i === sel ? "sel" : ""}" role="option" aria-selected="${i === sel}" data-i="${i}" style="text-align:left">
          <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">${resalta(r.t, q)}</div>${r.s ? `<div class="mut" style="font-size:12px">${resalta(r.s, q)}</div>` : ""}</div>
          ${r.der ? `<span class="mut num" style="font-size:12px;flex:none;text-align:right;line-height:1.4">${r.der}</span>` : ""}</button>`).join("")
          : `<div class="mut" style="padding:10px 12px;font-size:13.5px">${esc(o.vacio ? o.vacio(q) : "Sin resultados para «" + q + "»")}</div>`}</div>`;
    };
    const elige = i => { const r = res[i]; if (r) { cierra(); o.elegir(r, inp.value); } };
    inp.addEventListener("input", () => { sel = 0; pinta(); });
    inp.addEventListener("focus", () => { if (o.alVacio || inp.value.trim()) pinta(); });
    inp.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!res.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + res.length) % res.length;
        $$(".match", box).forEach((b, i) => { b.classList.toggle("sel", i === sel); b.setAttribute("aria-selected", i === sel); });
        const b = $$(".match", box)[sel]; if (b) b.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (o.enter && o.enter(inp.value, res[sel])) { cierra(); return; }
        if (res.length) elige(sel);
      } else if (e.key === "Escape" && box.innerHTML) { e.stopPropagation(); cierra(); }
    });
    box.addEventListener("mousedown", e => e.preventDefault());
    box.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) elige(+b.dataset.i); });
    inp.addEventListener("blur", () => setTimeout(cierra, 150));
  }
  const buscaArts = q => {
    const t = N(q).split(/\s+/).filter(Boolean);
    return D.articulos.filter(a => a.tipo !== "Servicio" && t.every(x => N(a.cod + " " + a.desc + " " + (a.marca || "") + " " + (a.ean || "") + " " + (a.sub || "")).includes(x))).slice(0, 8);
  };
  const artItem = a => ({ id: a.id, a, t: a.desc, s: a.cod + " · " + (a.marca || "") + (a.ean ? " · " + a.ean : ""), der: "costo " + grp(a.costo) + "<br>" + grp(D.stockTotal(a.id)) + " " + esc(unid(a)) });
  const provActivos = () => D.proveedores.filter(p => !p.inactivo);
  const buscaProvs = q => {
    const t = N(q).split(/\s+/).filter(Boolean);
    return provActivos().filter(p => t.every(x => N(p.nom + " " + p.ced + " " + p.linea).includes(x))).slice(0, 8);
  };
  const provItem = p => ({ id: p.id, p, t: p.nom, s: p.ced + " · " + p.linea, der: p.plazo + " días<br>" + desempeno(p.id).otif + " % a tiempo" });
  /* para el lector: «12*código» o un código exacto se resuelve sin la lista */
  function porCodigo(txt) {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*\*\s*(.+)$/.exec(txt || "");
    const cod = (m ? m[2] : txt || "").trim().toLowerCase();
    const a = D.articulos.find(x => x.cod.toLowerCase() === cod || (x.ean && x.ean === cod));
    return a ? { a, n: m ? parseFloat(m[1].replace(",", ".")) : null } : m ? { a: null, n: null, err: m[2] } : null;
  }

  /* QR de la orden (dibujo determinista a partir del consecutivo) */
  function qrSvg(txt, n) {
    n = n || 25;
    let h = 7;
    for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const px = [];
    const fin = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let on;
      if (fin(x, y)) { const cx = x < 7 ? x : x - (n - 7), cy = y < 7 ? y : y - (n - 7); on = cx === 0 || cy === 0 || cx === 6 || cy === 6 || (cx >= 2 && cx <= 4 && cy >= 2 && cy <= 4); }
      else { h = (h * 1103515245 + 12345) >>> 0; on = (h >> 16) % 2 === 0; }
      if (on) px.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
    return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" style="width:190px;height:190px;background:#fff;border-radius:8px" role="img" aria-label="Código QR de ${esc(txt)}"><g fill="#111">${px.join("")}</g></svg>`;
  }

  /* desempeño del proveedor (últimos 90 días): lo que mide el sistema, no la memoria */
  function desempeno(pid) {
    let h = 7;
    for (const ch of pid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let ents = 6 + h % 9, tarde = h % 3, incomp = (h >> 3) % 3;
    /* lo recibido en la sesión también cuenta */
    OCS().filter(o => o.provId === pid && o.rec && o.rec.cerrada && !o.rec.seed).forEach(o => {
      ents++;
      if (recStats(o).comp < o.lineas.length) incomp++;
    });
    const lead = (IX().LEAD || {})[pid] || 4;
    const lineas = OCS().filter(o => o.provId === pid).reduce((a, o) => a.concat(o.lineas), []);
    const varP = lineas.length ? lineas.reduce((s, l) => s + Math.abs(l.var || 0), 0) / lineas.length : 0;
    return {
      ents, aTiempo: ents - tarde, completas: ents - incomp,
      otif: Math.round(((ents - Math.max(tarde, incomp)) / ents) * 100),
      fill: Math.round(100 - incomp * 2.5 - (h % 5) * 0.4),
      lead, leadReal: lead + (h % 4 === 0 ? 2 : h % 2),
      varP: Math.round(varP * 10) / 10,
      nc: D.recibidos.filter(r => r.provId === pid && /crédito/.test(r.tipo)).length
    };
  }

  /* ══ ÓRDENES DE COMPRA ═══════════════════════════════════════
     Bandeja por estado a la izquierda; la orden a la derecha con su
     recorrido, sus líneas (que se editan mientras está registrada),
     la negociación, el QR, la copia a otro local y la anulación. */
  const FILTROS = [
    { v: "Abiertas", f: o => abierta(o) },
    { v: "Por aprobar", f: o => o.estado === "Registrada" },
    { v: "Por recibir", f: o => o.estado === "Aprobada" },
    { v: "Por registrar", f: o => recibida(o) },
    { v: "Cerradas", f: o => !abierta(o) }
  ];
  let ocFiltro = "Abiertas", ocSel = (D.compras.find(o => o.principal) || D.compras[0]).cons, foco = null;
  const MAS = [];
  const ordenFecha = (a, b) => b.fecha - a.fecha;

  A.screen("ordenes", {
    title: "Órdenes de compra",
    sub: () => { const o = OCS(); return o.filter(abierta).length + " abiertas · " + o.filter(x => x.estado === "Registrada").length + " por aprobar · 2 500 a 3 000 facturas de compra al mes en producción"; },
    extra: () => `<button class="btn" data-ir="reposicion|sugerido">${icon("sparkle")}Sugerido de compra</button><button class="btn pri" id="ocNueva">${icon("plus")}Nueva orden</button>`,
    prep(arg) {
      if (!arg) return;
      const o = ocDe(arg), f = FILTROS.find(x => x.v === ocFiltro);
      ocSel = o ? o.cons : arg; S.arg = null;
      if (o && !f.f(o)) ocFiltro = abierta(o) ? "Abiertas" : "Cerradas";
    },
    render(v) {
      const f = FILTROS.find(x => x.v === ocFiltro) || FILTROS[0];
      const rows = OCS().filter(f.f).sort(ordenFecha);
      if (!rows.some(o => o.cons === ocSel) && rows.length) ocSel = rows[0].cons;
      const oc = rows.find(o => o.cons === ocSel) || null;
      const cuenta = x => OCS().filter(x.f).length;
      const masivo = ocFiltro === "Por aprobar" && rows.length > 1;
      const selM = MAS.filter(cn => rows.some(o => o.cons === cn));
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div style="margin:-4px 0 10px">${field("Mostrar", `<select class="inp" id="ocf">${FILTROS.map(x => `<option value="${x.v}" ${x.v === ocFiltro ? "selected" : ""}>${x.v} · ${cuenta(x)}</option>`).join("")}</select>`)}</div>
            ${masivo ? `<div style="display:flex;flex-direction:column;gap:6px;align-items:stretch;margin-bottom:10px"><span class="mut" style="font-size:12.5px">${selM.length} seleccionadas · ${c(rows.filter(o => selM.indexOf(o.cons) >= 0).reduce((s, o) => s + o.total, 0))}</span>
              <button class="btn sm" id="ocMasivo" ${selM.length ? "" : "disabled"}>${icon("check")}Aprobar seleccionadas</button></div>` : ""}
            ${listaOC(rows, ocSel, { check: masivo ? MAS : null, vacioT: "Ninguna orden en «" + ocFiltro + "»", vacioP: "Cambie el filtro o cree una orden nueva." })}`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">${oc ? detalleOC(oc) : card({ body: empty("truck", "Escoja una orden", "O cree una nueva desde el botón de arriba o desde el sugerido de compra.") })}</div>
      </div>`;
    },
    wire(v) {
      A.wireIr(v); wirePasos(v);
      const fs = $("#ocf", v); if (fs) fs.addEventListener("change", () => { ocFiltro = fs.value; A.refresh(); });
      $$("[data-oc]", v).forEach(b => b.addEventListener("click", () => { ocSel = b.dataset.oc; A.refresh(); }));
      $$(".ocChk", v).forEach(ch => ch.addEventListener("change", () => {
        const i = MAS.indexOf(ch.value);
        if (ch.checked && i < 0) MAS.push(ch.value); else if (!ch.checked && i >= 0) MAS.splice(i, 1);
        A.refresh();
      }));
      const nb = $("#ocNueva", document); if (nb) nb.addEventListener("click", nuevaOrden);
      const ms = $("#ocMasivo", v); if (ms) ms.addEventListener("click", aprobarVarias);
      const oc = ocDe(ocSel);
      if (oc) wireOC(v, oc);
      if (foco) { const el = $(foco, v); foco = null; if (el) { el.focus(); if (el.select) el.select(); } }
    }
  });

  function detalleOC(oc) {
    const p = D.provById[oc.provId] || {};
    const edit = oc.estado === "Registrada";
    if (edit) oc.lineas.forEach(l => { l.var = varDe(l); });
    const neg = (p.negociaciones || []).find(n => n.id === oc.neg) || { t: "Normal", plazo: p.plazo };
    const pesoT = oc.lineas.reduce((s, l) => s + l.cant * ((artOf(l.artId) || {}).peso || 0), 0);
    const bl = oc.lineas.filter(bloqueada).length;
    const cols = [
      { t: "#", cls: "mono dim", w: "34px", fmt: (r, i) => i + 1 },
      { t: "Código", cls: "mono", w: "96px", fmt: r => esc(artOf(r.artId).cod) },
      { t: "Descripción", fmt: r => { const a = artOf(r.artId), pc = presC(a); return `${esc(a.desc)}${pc.f > 1 ? `<span class="sub ui">se compra por ${esc(String(pc.u).toLowerCase())}</span>` : ""}`; } },
      {
        t: "Cantidad", r: true, cls: "mono", w: "132px", fmt: (r, i) => edit
          ? `<input class="inp num" data-lc="${i}" value="${r.cant}" inputmode="decimal" aria-label="Cantidad de ${esc(artOf(r.artId).desc)}" style="width:82px;text-align:right;padding:4px 7px"> <span class="dim">${esc(unid(artOf(r.artId)))}</span>`
          : cantTxt(r.cant, artOf(r.artId))
      },
      {
        t: "Costo", r: true, cls: "mono", w: "104px", fmt: (r, i) => edit
          ? `<input class="inp num" data-lk="${i}" value="${r.costo}" inputmode="decimal" aria-label="Costo de ${esc(artOf(r.artId).desc)}" style="width:84px;text-align:right;padding:4px 7px;${bloqueada(r) ? "border-color:var(--crit);color:var(--crit)" : ""}">`
          : `<span style="${bloqueada(r) ? "color:var(--crit);font-weight:700" : ""}">${grp(r.costo)}</span>`
      },
      { t: "Costo vigente", r: true, cls: "mono", w: "96px", fmt: r => `<span class="mut">${grp(artOf(r.artId).costo)}</span>` },
      {
        t: "Var.", r: true, cls: "mono", w: "128px", fmt: (r, i) => {
          const fuera = Math.abs(r.var) > POL.topeVar;
          const txt = `<span style="color:${fuera ? "var(--crit)" : Math.abs(r.var) > 5 ? "var(--warn)" : "var(--ink-3)"};${fuera ? "font-weight:700" : ""}">${r.var > 0 ? "+" : ""}${dec(r.var, 1)} %</span>`;
          if (!fuera) return txt;
          if (r.aut) return txt + `<span class="sub" style="color:var(--ok)">autorizó ${esc(r.aut.por.split(" ")[0])}</span>`;
          return txt + (edit ? `<span class="sub"><button class="btn sm" data-aut="${i}" style="padding:2px 8px">Autorizar</button></span>` : "");
        }
      },
      { t: "IVA", r: true, cls: "mono dim", w: "62px", fmt: r => `<span style="white-space:nowrap">${D.tarifaDe(r)} %</span>` },
      { t: "Total", r: true, cls: "mono", w: "112px", fmt: r => `<b>${grp(Math.round(r.cant * r.costo))}</b>` }
    ];
    if (edit) cols.push({ t: "", w: "36px", fmt: (r, i) => `<button class="iconbtn" data-del="${i}" aria-label="Quitar ${esc(artOf(r.artId).desc)}" style="width:26px;height:26px">${icon("x")}</button>` });
    const acciones = [
      edit ? `<button class="btn sm" id="ocPlant">${icon("upload")}Cargar desde plantilla</button>` : "",
      oc.estado !== "Anulada" ? `<button class="btn sm" id="ocCopia">${icon("copy")}Copiar a otro local</button>` : "",
      oc.aprobadoPor && oc.estado !== "Anulada" ? `<button class="btn sm" id="ocQR">${icon("scan")}QR de la orden</button>` : "",
      oc.estado === "Registrada" && !oc.aprobadoPor ? `<button class="btn sm" id="ocElimina" style="color:var(--crit)">${icon("trash")}Eliminar borrador</button>` : "",
      oc.estado === "Aprobada" ? `<button class="btn sm" id="ocAnula">${icon("x")}Anular</button>` : ""
    ].join("");
    return `${pasos(oc)}
      ${siguiente(oc, "ordenes")}
      ${card({
      body: `<div class="ficha" style="margin:-12px -17px -16px">
          ${fichaCell("Orden", (/^BOR-/.test(oc.cons) ? `${esc(nomOC(oc.cons))}<span class="sub">número temporal · el consecutivo se asigna al aprobar</span>` : esc(oc.cons) + (oc.borrador ? `<span class="sub">fue el ${esc(nomOC(oc.borrador).toLowerCase())}</span>` : "")) + (oc.tipo === "Autoconsumo" ? " " + tag("Autoconsumo · " + (oc.area || "taller"), "in") : ""))}
          ${fichaCell("Proveedor", `<button id="ocProv" title="Abrir la ficha sin salir de la orden" style="all:unset;cursor:pointer;font-family:var(--ui);font-size:14px;color:var(--accent);text-decoration:underline;text-underline-offset:3px">${esc(p.nom)}</button><span class="sub">${esc(p.ced)} · ver o editar sin salir</span>`)}
          ${fichaCell("Destino", `<span style="font-family:var(--ui);font-size:14px">${esc(locNom(oc.locId))}</span>`)}
          ${fichaCell("Condición de pago", `<span style="font-family:var(--ui);font-size:14px">${oc.plazo} días</span><span class="sub">${esc(neg.t)}${neg.desc ? " · " + dec(neg.desc, neg.desc % 1 ? 1 : 0) + " %" : ""}${oc.plazo !== neg.plazo ? " · plazo especial" : ""}</span>${abierta(oc) ? ` <button class="btn sm" id="ocPlazo" style="margin-top:4px">Cambiar</button>` : ""}`)}
          ${fichaCell("Estado", estTag(oc).replace('class="tag', 'style="white-space:normal;height:auto;line-height:1.35;padding-top:3px;padding-bottom:3px" class="tag'))}
        </div>`
    })}
      ${card({
      title: "Líneas de la orden", hint: edit ? "Enter pasa a la línea de abajo · la variación sobre ±" + POL.topeVar + " % bloquea la aprobación" : "orden firme: para cambiarla se anula o se copia",
      actions: acciones,
      body: (edit ? buscadorHTML("ocAdd", "Agregar artículo: nombre, código o código de barras · 24*código agrega 24", { ic: "scan", style: "margin:0 0 12px" }) : "") +
        table({
          h: "calc(100dvh - 430px)",
          cols, rows: oc.lineas,
          rowCls: r => (bloqueada(r) ? "cr" : ""),
          foot: [{ v: oc.lineas.length + " líneas · " + kg(pesoT) + (bl ? " · " + bl + " bloqueada" + (bl > 1 ? "s" : "") : ""), span: cols.length - (edit ? 2 : 1) }, { v: grp(oc.sub), r: true, cls: "mono" }].concat(edit ? [{ v: "" }] : [])
        }) +
        `<div class="ficha" style="border-top:1px solid var(--hair)">
          ${fichaCell("Subtotal", c(oc.sub))}
          ${(oc.porTarifa || []).map(t => fichaCell("IVA " + t.tarifa + " %", c(t.iva))).join("") || fichaCell("IVA", c(oc.iva))}
          ${fichaCell("Total de la orden", `<b>${c(oc.total)}</b>`)}
          ${fichaCell("Peso", kg(pesoT))}
        </div>`
    })}
      ${card({
      title: "Historial", hint: "quién hizo qué, con fecha y hora",
      body: `<div class="reclist">${oc.hist.slice().reverse().map(h => `<div class="rec"><div style="flex:1"><div style="font-size:13.5px">${esc(h.acc)}</div><div class="mut" style="font-size:12px">${esc(h.quien)}</div></div><span class="mut num" style="font-size:12px">${fecha(h.f)} · ${U.hora ? U.hora(h.f) : ""}</span></div>`).join("")}</div>`
    })}`;
  }

  const num = v => { const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : null; };

  function wireOC(v, oc) {
    const ap = $("#ocAprobar", v); if (ap) ap.addEventListener("click", () => aprobar(oc, true));
    const pr = $("#ocProv", v); if (pr) pr.addEventListener("click", () => provSheet(oc.provId, true));
    const pz = $("#ocPlazo", v); if (pz) pz.addEventListener("click", () => plazoSheet(oc));
    const pl = $("#ocPlant", v); if (pl) pl.addEventListener("click", () => plantillaSheet(oc));
    const cp = $("#ocCopia", v); if (cp) cp.addEventListener("click", () => copiarSheet(oc));
    const qr = $("#ocQR", v); if (qr) qr.addEventListener("click", () => qrSheet(oc));
    const an = $("#ocAnula", v); if (an) an.addEventListener("click", () => anularSheet(oc));
    const el = $("#ocElimina", v); if (el) el.addEventListener("click", () => eliminarSheet(oc));
    $$("[data-aut]", v).forEach(b => b.addEventListener("click", () => autorizarLinea(oc, oc.lineas[+b.dataset.aut])));
    $$("[data-del]", v).forEach(b => b.addEventListener("click", () => {
      if (!exige("comprar", "Editar la orden")) return;
      const l = oc.lineas.splice(+b.dataset.del, 1)[0];
      totales(oc);
      anotar("Quitó línea de la orden", oc.cons + " · " + artOf(l.artId).desc, oc);
      A.refresh();
    }));
    /* cantidades y costos: Enter guarda y baja a la línea siguiente */
    const guarda = (inp, sigue) => {
      const i = +(inp.dataset.lc || inp.dataset.lk), l = oc.lineas[i], n = num(inp.value), a = artOf(l.artId);
      const campo = inp.dataset.lc != null ? "cant" : "costo";
      if (n == null || n <= 0) { inp.value = l[campo]; return toast("Valor no válido", "Escriba un número mayor que cero.", "cr"); }
      if (!puede("comprar")) { inp.value = l[campo]; return exige("comprar", "Editar la orden"); }
      const nuevo = campo === "cant" ? (a.decimales ? Math.round(n * 100) / 100 : Math.round(n)) : Math.round(n * 100) / 100;
      if (nuevo !== l[campo]) {
        const antes = l[campo];
        l[campo] = nuevo;
        if (campo === "costo") {
          l.var = varDe(l); l.aut = null;
          anotar("Cambió costo en la orden", oc.cons + " · " + a.desc, oc, "₡" + grp(antes), "₡" + grp(nuevo));
          if (Math.abs(l.var) > POL.topeVar) toast("Costo fuera de rango", a.desc + ": " + (l.var > 0 ? "+" : "") + dec(l.var, 1) + " % contra el costo vigente de ₡" + grp(a.costo) + ". Corríjalo o pida la autorización.", "cr");
        }
        totales(oc);
      }
      if (sigue) {
        const k = inp.dataset.lc != null ? "lc" : "lk";
        foco = i + 1 < oc.lineas.length ? `[data-${k}="${i + 1}"]` : "#ocAdd";
      }
      A.refresh();
    };
    $$("[data-lc],[data-lk]", v).forEach(inp => {
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); inp._ok = true; guarda(inp, true); } });
      inp.addEventListener("change", () => { if (!inp._ok) guarda(inp, false); });
    });
    /* agregar artículo: resultados al digitar; el lector (código exacto o 24*código) entra directo */
    const agrega = (a, n) => {
      if (!exige("comprar", "Editar la orden")) return;
      const i = oc.lineas.findIndex(l => l.artId === a.id);
      if (i >= 0) {
        if (n) oc.lineas[i].cant += n;
        totales(oc); pita("wa");
        toast("Ya estaba en la orden", a.desc + (n ? ": se sumaron " + grp(n) : ": revise la cantidad en la línea " + (i + 1)), "wa");
        foco = n ? "#ocAdd" : `[data-lc="${i}"]`;
      } else {
        oc.lineas.push({ artId: a.id, cant: n || presC(a).f || 1, costo: a.costo, var: 0 });
        totales(oc); pita("ok");
        foco = `[data-lc="${oc.lineas.length - 1}"]`;
      }
      A.refresh();
    };
    wireBuscador(v, "ocAdd", {
      buscar: q => buscaArts(q.replace(/^\s*\d+(?:[.,]\d+)?\s*\*\s*/, "")).map(artItem),
      alVacio: () => D.articulos.filter(a => a.provId === oc.provId && a.tipo !== "Servicio" && !oc.lineas.some(l => l.artId === a.id)).slice(0, 8).map(artItem),
      tituloVacio: "Lo que se le compra a " + provCorto(oc.provId),
      vacio: q => "Ningún artículo coincide con «" + q + "». Pruebe con parte del nombre, la marca o el código.",
      enter: txt => {
        const x = porCodigo(txt);
        if (!x) return false;
        if (!x.a) { pita("cr"); toast("No se encontró", "«" + x.err + "» no está en el catálogo.", "cr"); return true; }
        agrega(x.a, x.n); return true;
      },
      elegir: (r, txt) => { const m = /^\s*(\d+(?:[.,]\d+)?)\s*\*/.exec(txt); agrega(r.a, m ? num(m[1]) : null); }
    });
  }

  /* ── pasos de la orden ── */
  function motivoNoAprueba(oc) {
    if (oc.estado !== "Registrada") return "Ya no está registrada";
    if (!oc.lineas.length) return "No tiene líneas";
    if (oc.creadoPor === D.sesion.nom) return "Quien hizo la orden no la aprueba";
    const bl = oc.lineas.filter(bloqueada).length;
    if (bl) return bl + " línea" + (bl > 1 ? "s" : "") + " con el costo fuera de rango";
    return null;
  }
  function aprobar(oc, avisa) {
    if (!exige("aprobar", "Aprobar órdenes de compra")) return false;
    const m = motivoNoAprueba(oc);
    if (m) { if (avisa) toast("No se aprobó " + oc.cons, m + ".", "cr"); return false; }
    oc.estado = "Aprobada";
    oc.aprobadoPor = D.sesion.nom;
    /* aquí, y no antes, toma el consecutivo oficial: un borrador eliminado no deja hueco */
    const antes = oc.cons;
    D.consecutivoOC(oc);
    if (ocSel === antes) { ocSel = oc.cons; if (avisa && ocFiltro === "Por aprobar") ocFiltro = "Abiertas"; }
    const im = MAS.indexOf(antes); if (im >= 0) MAS[im] = oc.cons;
    anotar("Aprobó orden de compra", oc.cons + (oc.borrador ? " (era " + nomOC(oc.borrador).toLowerCase() + ")" : "") + " · " + provNom(oc.provId) + " · ₡" + grp(oc.total), oc, "Borrador", "Aprobada");
    if (avisa) {
      toast("Orden aprobada · " + oc.cons, (oc.borrador ? "El " + nomOC(oc.borrador).toLowerCase() + " tomó el consecutivo " + oc.cons + ". " : "") + "Quedó firme y salió a " + provNom(oc.provId) + " por correo y WhatsApp, con el QR que usa la bodega.", "ok");
      A.refresh();
    }
    return true;
  }
  function aprobarVarias() {
    if (!exige("aprobar", "Aprobar órdenes de compra")) return;
    const sel = MAS.map(ocDe).filter(o => o && o.estado === "Registrada");
    const ok = sel.filter(o => !motivoNoAprueba(o)), no = sel.filter(o => motivoNoAprueba(o));
    openSheet({
      title: "Aprobar " + sel.length + " órdenes", sub: "Revise el resumen antes de confirmar",
      body: table({
        cols: [
          { t: "Borrador", cls: "mono", fmt: o => esc(nomOC(o.cons)) },
          { t: "Proveedor", fmt: o => esc(provNom(o.provId)) },
          { t: "Total", r: true, cls: "mono", fmt: o => grp(o.total) },
          { t: "", fmt: o => { const m = motivoNoAprueba(o); return m ? tag(m, "cr", "alert") : tag("Se aprueba", "ok", "check"); } }
        ], rows: sel,
        foot: [{ v: ok.length + " se aprueban", span: 2 }, { v: grp(ok.reduce((s, o) => s + o.total, 0)), r: true, cls: "mono" }, { v: no.length ? no.length + " quedan" : "" }]
      }),
      footer: `<div style="flex:1"></div><button class="btn" id="mX">Cancelar</button><button class="btn pri" id="mOk" ${ok.length ? "" : "disabled"}>${icon("check")}Aprobar ${ok.length}</button>`,
      after: r => {
        $("#mX", r).addEventListener("click", closeSheet);
        $("#mOk", r).addEventListener("click", () => {
          ok.forEach(o => aprobar(o, false));
          MAS.length = 0; closeSheet();
          toast(ok.length + " órdenes aprobadas", "Tomaron su consecutivo, quedaron firmes y salieron a sus proveedores. " + (no.length ? no.length + " quedaron registradas por su motivo." : ""), "ok");
          A.refresh();
        });
      }
    });
  }
  function autorizarLinea(oc, l) {
    if (!exige("autorizar", "Autorizar un costo fuera de rango")) return;
    if (oc.creadoPor === D.sesion.nom) return toast("No se autorizó", "Quien hizo la orden no autoriza su propio costo.", "cr");
    const a = artOf(l.artId);
    openSheet({
      title: "Autorizar costo fuera de rango", sub: a.desc,
      body: `<dl class="kv"><dt>Costo en la orden</dt><dd class="num">${c(l.costo)}</dd><dt>Costo vigente</dt><dd class="num">${c(a.costo)}</dd>
          <dt>Variación</dt><dd class="num" style="color:var(--crit)">${l.var > 0 ? "+" : ""}${dec(l.var, 1)} %</dd></dl>
        <div class="stepbar" style="margin-top:14px"><div class="sbt"><b>Antes de autorizar</b><span>Una variación tan grande suele ser un error de digitación (4 100 → 41). Si es así, corrija el costo en la línea en vez de autorizarlo.</span></div></div>
        <div style="margin-top:12px">${field("Motivo", `<input class="inp" id="auM" placeholder="Ej.: el proveedor subió la lista el 1.º de setiembre">`)}</div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="auX">Cancelar</button><button class="btn pri" id="auOk">${icon("check")}Autorizar</button>`,
      after: r => {
        $("#auX", r).addEventListener("click", closeSheet);
        $("#auOk", r).addEventListener("click", () => {
          const m = $("#auM", r).value.trim();
          if (!m) return toast("Falta el motivo", "La autorización guarda por qué se aceptó el costo.", "cr");
          l.aut = { por: D.sesion.nom, f: D.ahora(), motivo: m };
          anotar("Autorizó costo fuera de rango", oc.cons + " · " + a.desc + " · " + m, oc, "₡" + grp(a.costo), "₡" + grp(l.costo), "Alta");
          closeSheet(); A.refresh();
        });
      }
    });
  }

  function nuevaOrden() {
    if (!exige("comprar", "Crear órdenes de compra")) return;
    let prov = null;
    openSheet({
      title: "Nueva orden de compra", sub: "Queda registrada; se edita hasta que Gerencia la apruebe",
      body: `<div style="display:flex;flex-direction:column;gap:12px">
          ${field("Proveedor", buscadorHTML("noP", "Nombre, cédula o línea del proveedor"))}
          <div id="noPsel" class="mut" style="font-size:13px;margin-top:-4px">Digite para buscar entre ${D.proveedores.length} proveedores.</div>
          ${field("Destino", `<select class="inp" id="noL">${D.locales.map(l => `<option value="${l.id}" ${l.id === "CD" ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>`)}
          ${field("Tipo de compra", `<select class="inp" id="noT"><option>Reventa</option><option value="Autoconsumo">Autoconsumo · uso interno, va al gasto al costo</option></select>`)}
          <div id="noArea" hidden>${field("Área que consume", `<select class="inp" id="noA"><option>Taller</option><option>Mantenimiento</option><option>Flotilla</option></select>`)}</div>
        </div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="noX">Cancelar</button><button class="btn pri" id="noOk">${icon("plus")}Crear orden</button>`,
      after: r => {
        wireBuscador(r, "noP", {
          buscar: q => buscaProvs(q).map(provItem),
          alVacio: () => provActivos().slice().sort((a, b) => b.saldo - a.saldo).slice(0, 6).map(provItem),
          tituloVacio: "Con más compras",
          vacio: q => "Ningún proveedor coincide con «" + q + "». Puede crearlo en Compras › Proveedores.",
          elegir: it => {
            prov = it.p;
            $("#noP", r).value = it.p.nom;
            $("#noPsel", r).innerHTML = `${tag("Elegido", "ok", "check")} <b>${esc(it.p.nom)}</b> · ${esc(it.p.ced)} · ${it.p.plazo} días`;
            $("#noL", r).focus();
          }
        });
        $("#noT", r).addEventListener("change", e => { $("#noArea", r).hidden = e.target.value !== "Autoconsumo"; });
        $("#noX", r).addEventListener("click", closeSheet);
        $("#noOk", r).addEventListener("click", () => {
          if (!prov) { $("#noP", r).focus(); return toast("Falta el proveedor", "Búsquelo por nombre, cédula o línea y elíjalo de la lista.", "cr"); }
          const oc = nuevaOC(prov.id, $("#noL", r).value, [], "Registrada");
          if ($("#noT", r).value === "Autoconsumo") { oc.tipo = "Autoconsumo"; oc.area = $("#noA", r).value; }
          anotar("Creó orden de compra", oc.cons + " · " + provNom(oc.provId) + " · " + locNom(oc.locId) + (oc.tipo === "Autoconsumo" ? " · autoconsumo " + oc.area : ""), oc);
          ocSel = oc.cons; ocFiltro = "Por aprobar"; foco = "#ocAdd";
          closeSheet(); A.go("ordenes");
        });
      }
    });
  }

  function plazoSheet(oc) {
    const p = D.provById[oc.provId];
    const negs = p.negociaciones || [{ id: "N", t: "Normal", plazo: p.plazo, desc: 0 }];
    openSheet({
      title: "Condición de pago de la orden", sub: p.nom + " · " + oc.cons,
      body: `<div style="display:flex;flex-direction:column;gap:9px">
          ${negs.map(n => `<label class="chipck" style="justify-content:flex-start"><input type="radio" name="neg" value="${n.id}" ${oc.neg === n.id ? "checked" : ""}><span><b>${esc(n.t)}</b> · ${n.plazo} días${n.desc ? " · " + dec(n.desc, n.desc % 1 ? 1 : 0) + " % de descuento" : ""}</span></label>`).join("")}
          ${field("Plazo especial solo para esta compra (días)", `<input class="inp num" id="pzD" inputmode="numeric" placeholder="Dejar vacío para usar la negociación" style="max-width:220px">`)}
          ${field("Motivo", `<input class="inp" id="pzM" placeholder="Ej.: pedido grande de temporada, el proveedor dio 45 días">`)}
          <div class="mut" style="font-size:12.5px">El cambio queda en la bitácora con quién lo hizo. No toca la ficha del proveedor (COM-017).</div></div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="pzX">Cancelar</button><button class="btn pri" id="pzOk">Guardar</button>`,
      after: r => {
        $("#pzX", r).addEventListener("click", closeSheet);
        $("#pzOk", r).addEventListener("click", () => {
          if (!exige("comprar", "Cambiar la condición de pago")) return;
          const sel = $('input[name="neg"]:checked', r), n = negs.find(x => x.id === (sel ? sel.value : "N")) || negs[0];
          const d = num($("#pzD", r).value), m = $("#pzM", r).value.trim();
          const plazo = d ? Math.round(d) : n.plazo;
          if (d && !m) return toast("Falta el motivo", "Un plazo especial necesita su motivo.", "cr");
          const antes = oc.plazo + " días";
          oc.neg = n.id; oc.plazo = plazo;
          anotar("Cambió condición de pago en la orden", oc.cons + " · " + p.nom + (m ? " · " + m : ""), oc, antes, plazo + " días");
          closeSheet(); A.refresh();
        });
      }
    });
  }

  function plantillaSheet(oc) {
    if (!exige("comprar", "Editar la orden")) return;
    let muestra = D.articulos.filter(a => a.provId === oc.provId && a.tipo !== "Servicio").slice(0, 5);
    if (muestra.length < 3) muestra = D.articulos.filter(a => a.tipo !== "Servicio" && a.ean).slice(0, 5);
    pegarSheet({
      titulo: "Cargar líneas desde plantilla", sub: "Pegue desde Excel: código y cantidad por fila (COM-015)", muestra,
      yaEsta: id => oc.lineas.some(l => l.artId === id),
      cargar: ok => {
        ok.forEach(f => { const l = oc.lineas.find(x => x.artId === f.a.id); if (l) l.cant += f.n; else oc.lineas.push({ artId: f.a.id, cant: f.n, costo: f.a.costo, var: 0 }); });
        totales(oc);
        anotar("Cargó líneas desde plantilla", oc.cons + " · " + ok.length + " filas", oc);
        A.refresh();
      }
    });
  }

  function copiarSheet(oc) {
    if (!exige("comprar", "Copiar órdenes")) return;
    openSheet({
      title: "Copiar " + oc.cons + " a otro local", sub: "Sale una orden nueva, registrada, con las mismas líneas y costos (COM-016)",
      body: `${field("Local de destino", `<select class="inp" id="cpL">${D.locales.filter(l => l.id !== oc.locId).map(l => `<option value="${l.id}">${esc(l.nom)}</option>`).join("")}</select>`)}
        <label class="chipck" style="margin-top:12px"><input type="checkbox" id="cpA" ${oc.estado === "Registrada" ? "" : "disabled"}><span>Eliminar el borrador original (solo si todavía es borrador)</span></label>`,
      footer: `<div style="flex:1"></div><button class="btn" id="cpX">Cancelar</button><button class="btn pri" id="cpOk">${icon("copy")}Copiar</button>`,
      after: r => {
        $("#cpX", r).addEventListener("click", closeSheet);
        $("#cpOk", r).addEventListener("click", () => {
          const loc = $("#cpL", r).value;
          const n = nuevaOC(oc.provId, loc, oc.lineas.map(l => ({ a: l.artId, c: l.cant, k: l.costo, v: l.var })), "Registrada");
          n.tipo = oc.tipo; n.area = oc.area; n.neg = oc.neg; n.plazo = oc.plazo; n.origen = oc.cons;
          n.hist[0].acc = "Registró la orden copiando " + oc.cons;
          anotar("Copió orden de compra", oc.cons + " → " + n.cons + " · " + locNom(loc), oc);
          if ($("#cpA", r).checked && oc.estado === "Registrada") eliminarOC(oc, "se copió a " + locNom(loc) + " (" + n.cons + ")");
          ocSel = n.cons; ocFiltro = "Por aprobar";
          closeSheet(); toast("Orden copiada", n.cons + " para " + locNom(loc) + ", lista para revisar.", "ok"); A.refresh();
        });
      }
    });
  }

  function qrSheet(oc) {
    openSheet({
      title: "QR de " + oc.cons, sub: "Va impreso en la orden que recibe el proveedor (COM-004)",
      body: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">${qrSvg(oc.cons)}
          <div class="num" style="font-size:15px;font-weight:700">${esc(oc.cons)}</div>
          <div class="mut" style="font-size:13px;text-align:center;max-width:320px">El camión llega con la orden; la bodega escanea este código y la recepción se abre con las ${oc.lineas.length} líneas precargadas.</div></div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="qrX">Cerrar</button><button class="btn pri" id="qrR">${icon("scan")}Abrir la recepción</button>`,
      after: r => {
        $("#qrX", r).addEventListener("click", closeSheet);
        $("#qrR", r).addEventListener("click", () => A.go("recepcion", oc.cons));
      }
    });
  }

  /* Eliminar: solo un borrador que nunca se aprobó. No deja rastro en la lista, sí en la bitácora
     (quién, cuándo, proveedor, líneas y total). Una orden aprobada no se elimina: se anula. */
  function eliminarOC(oc, motivo) {
    const i = D.compras.indexOf(oc);
    if (i < 0) return;
    D.compras.splice(i, 1);
    const m = MAS.indexOf(oc.cons); if (m >= 0) MAS.splice(m, 1);
    if (ocSel === oc.cons) ocSel = null;
    anotar("Eliminó borrador de orden de compra", oc.cons + " · " + provNom(oc.provId) + " · " + oc.lineas.length + " líneas · ₡" + grp(oc.total) + (motivo ? " · " + motivo : ""), oc, "Borrador", "Eliminado");
  }
  function eliminarSheet(oc) {
    if (!exige("comprar", "Eliminar un borrador de orden")) return;
    if (oc.estado !== "Registrada" || oc.aprobadoPor) return toast("Ya no es borrador", "Una orden aprobada no se elimina: se anula, con motivo.", "cr");
    openSheet({
      title: "¿Eliminar el " + nomOC(oc.cons).toLowerCase() + "?", sub: "Todavía no se envió al proveedor, así que no compromete nada",
      body: `<div style="display:flex;flex-direction:column;gap:12px">
          <dl class="kv"><dt>Proveedor</dt><dd>${esc(provNom(oc.provId))}</dd><dt>Destino</dt><dd>${esc(locNom(oc.locId))}</dd><dt>Líneas</dt><dd class="num">${oc.lineas.length}</dd><dt>Total</dt><dd class="num">${c(oc.total)}</dd></dl>
          <div style="display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">${icon("history", 'style="flex:none;color:var(--accent)"')}<div>Se quita de la lista y no se puede recuperar. No deja hueco en los consecutivos: el número oficial se asigna al aprobar. Queda en la bitácora quién la eliminó y qué tenía.${oc.origen ? " Venía de " + esc(oc.origen) + "." : ""}</div></div></div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="elX">Conservar</button><button class="btn pri" id="elOk" style="background:var(--crit);border-color:var(--crit)">${icon("trash")}Eliminar borrador</button>`,
      after: r => {
        $("#elX", r).addEventListener("click", closeSheet);
        $("#elOk", r).addEventListener("click", () => {
          eliminarOC(oc);
          closeSheet();
          toast("Borrador eliminado", nomOC(oc.cons) + " de " + provNom(oc.provId) + " ya no está en la lista. Quedó anotado en la bitácora.", "ok");
          A.refresh();
        });
      }
    });
  }

  function anularSheet(oc) {
    const acc = oc.estado === "Aprobada" ? "anularAprobada" : "comprar";
    if (!exige(acc, "Anular una orden " + oc.estado.toLowerCase())) return;
    if (oc.rec && Object.values(oc.rec.cant || {}).some(x => x > 0)) return toast("No se puede anular", "Ya hay mercadería contada en la recepción. Lo recibido se devuelve con nota de débito en Cobros y pagos.", "cr");
    openSheet({
      title: "Anular " + oc.cons, sub: "La orden no se borra: queda anulada, con motivo y firma",
      body: `<div style="display:flex;flex-direction:column;gap:12px">
          ${field("Motivo", `<select class="inp" id="anM"><option>El proveedor no tiene la mercadería</option><option>El precio cambió</option><option>Orden duplicada</option><option>Se compró a otro proveedor</option><option>Otro</option></select>`)}
          ${field("Detalle", `<textarea class="inp" id="anD" rows="3" placeholder="Obligatorio"></textarea>`)}</div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="anX">Cancelar</button><button class="btn pri" id="anOk" style="background:var(--crit);border-color:var(--crit)">Anular</button>`,
      after: r => {
        $("#anX", r).addEventListener("click", closeSheet);
        $("#anOk", r).addEventListener("click", () => {
          const d = $("#anD", r).value.trim();
          if (!d) return toast("Falta el detalle", "La anulación guarda por qué.", "cr");
          const antes = oc.estado;
          oc.estado = "Anulada";
          oc.anulada = { por: D.sesion.nom, f: D.ahora(), motivo: $("#anM", r).value + " · " + d };
          anotar("Anuló orden de compra", oc.cons + " · " + oc.anulada.motivo, oc, antes, "Anulada", "Alta");
          if (antes === "Aprobada") toast("Orden anulada", "Se avisó a " + provNom(oc.provId) + " que no despache.", "ok");
          closeSheet(); A.refresh();
        });
      }
    });
  }

  /* ══ RECEPCIÓN EN BODEGA ═════════════════════════════════════
     Sustituye la hoja de papel con resaltador (COM-003): se escanea
     contra la orden, la diferencia se ve al instante, lo que no se
     pidió queda con trazabilidad sin tocar el catálogo (COM-020) y la
     entrega queda con placa, transportista, sello y foto (COM-019).
     Después de registrar la compra, aquí mismo se reparte a los
     locales y salen los traslados (COM-009). */
  let recSel = null, recFb = null, recFlash = null;
  const TRATO = {
    falta: [["pendiente", "Queda pendiente · el proveedor la trae"], ["corto", "No vendrá · cerrar corto"]],
    sobra: [["devolver", "Se devuelve al transportista"], ["aceptar", "Se acepta al costo de la orden"]]
  };
  function recDe(oc) {
    return oc.rec || (oc.rec = { cant: {}, trato: {}, extra: [], evid: { placa: "", transp: "", sello: false, fotos: 0 }, ciega: false, inicio: D.ahora() });
  }

  A.screen("recepcion", {
    title: "Recepción en bodega",
    sub: () => { const o = OCS(); return o.filter(x => x.estado === "Aprobada").length + " órdenes por recibir · " + o.filter(porRepartir).length + " por repartir"; },
    extra: () => `<button class="btn" id="btnVerAppComp">${icon("phone")}App de bodega</button>`,
    prep(arg) { if (arg) { recSel = arg; recFb = null; S.arg = null; } },
    render(v) {
      const O = OCS().sort(ordenFecha);
      const porRec = O.filter(o => o.estado === "Aprobada"), porRep = O.filter(porRepartir);
      if (!recSel || !ocDe(recSel)) recSel = (porRec[0] || porRep[0] || {}).cons || null;
      const oc = recSel ? ocDe(recSel) : null;
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div class="scan" style="margin:-2px 0 12px">${icon("scan")}<input id="recQR" type="text" autocomplete="off" placeholder="Escanee el QR de la orden"></div>
            <div class="mut" style="font-size:12px;margin-bottom:6px">Por recibir</div>
            ${listaOC(porRec, recSel, { estado: false, vacioT: "Nada por recibir", vacioP: "Las órdenes aprobadas aparecen aquí." })}
            ${porRep.length ? `<div class="mut" style="font-size:12px;margin:14px 0 6px">Por repartir a los locales</div>${listaOC(porRep, recSel, { estado: false })}` : ""}`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">${oc ? vistaRec(oc) : card({ body: empty("scan", "No hay recepciones pendientes", "Escanee el QR de una orden para abrirla.") })}</div>
      </div>`;
    },
    wire(v) {
      A.wireIr(v); wirePasos(v);
      const app = $("#btnVerAppComp", document); if (app) app.addEventListener("click", () => A.actions.appmovil && A.actions.appmovil());
      $$("[data-oc]", v).forEach(b => b.addEventListener("click", () => { recSel = b.dataset.oc; recFb = null; A.refresh(); }));
      const qr = $("#recQR", v);
      if (qr) qr.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const t = qr.value.trim().toUpperCase(), o = OCS().find(x => x.cons === t || x.cons.slice(-6) === t.replace(/\D/g, "").slice(-6));
        if (!o) { pita("cr"); return toast("Orden no encontrada", "«" + qr.value + "» no es una orden de compra.", "cr"); }
        pita("ok"); recSel = o.cons; recFb = null; A.refresh();
      });
      const oc = recSel && ocDe(recSel);
      if (!oc) return;
      if (oc.estado === "Aprobada") wireRecibir(v, oc);
      if (porRepartir(oc)) wireReparto(v, oc);
    }
  });

  function vistaRec(oc) {
    const cab = pasos(oc) + siguiente(oc, "recepcion");
    if (oc.estado === "Registrada") return cab + card({ body: empty("lock", "La orden todavía no está aprobada", "La bodega no recibe mercadería sin una orden firme. Gerencia la aprueba en Órdenes de compra.") });
    if (oc.estado === "Anulada") return cab + card({ body: empty("x", "Orden anulada", "Si el camión llegó, la mercadería se devuelve o entra con una orden nueva.") });
    if (oc.estado === "Aprobada") return cab + recibirHTML(oc);
    if (porRepartir(oc)) return cab + repartoHTML(oc);
    return cab + resumenRec(oc);
  }

  /* ── contar ── */
  function recFilas(oc) {
    const r = recDe(oc);
    return oc.lineas.map(l => {
      const x = r.cant[l.artId] || 0;
      return { l, a: artOf(l.artId), rec: x, dif: x - l.cant };
    });
  }
  function progHTML(oc) {
    const s = recStats(oc), F = recFilas(oc);
    const falt = F.filter(f => f.rec > 0 && f.dif < 0).length, sob = F.filter(f => f.dif > 0).length;
    const w1 = s.n ? (s.comp / s.n) * 100 : 0, w2 = s.n ? (falt / s.n) * 100 : 0, w3 = s.n ? (sob / s.n) * 100 : 0;
    return `${U.prog([{ w: w1.toFixed(1), col: "var(--ok)" }, { w: w2.toFixed(1), col: "var(--crit)" }, { w: w3.toFixed(1), col: "var(--warn)" }])}
      <div class="mut" style="font-size:12.5px;margin-top:6px;display:flex;gap:14px;flex-wrap:wrap"><span><b class="num" style="color:var(--ink)">${s.comp}</b> de ${s.n} líneas completas</span>
      <span><b class="num" style="color:var(--ink)">${grp(s.uni)}</b> de ${grp(s.ped)} unidades</span>${falt ? `<span style="color:var(--crit)">${falt} con faltante</span>` : ""}${sob ? `<span style="color:var(--warn)">${sob} con sobrante</span>` : ""}</div>`;
  }
  function tablaRec(oc) {
    const r = recDe(oc), ciega = r.ciega;
    const cols = [
      { t: "Código", cls: "mono", w: "96px", fmt: f => esc(f.a.cod) },
      { t: "Descripción", fmt: f => `${esc(f.a.desc)}<span class="sub ui">${esc(f.a.ean ? "EAN " + f.a.ean : "sin código de barras")}${presC(f.a).f > 1 ? " · viene por " + esc(String(presC(f.a).u).toLowerCase()) : ""}</span>` }
    ];
    if (!ciega) cols.push({ t: "Pedido", r: true, cls: "mono", w: "120px", fmt: f => cantTxt(f.l.cant, f.a) });
    cols.push({ t: "Recibido", r: true, cls: "mono", w: "130px", fmt: f => `<input class="inp num" data-rc="${f.a.id}" value="${f.rec || ""}" placeholder="0" inputmode="decimal" aria-label="Recibido de ${esc(f.a.desc)}" style="width:80px;text-align:right;padding:4px 7px"> <span class="dim">${esc(unid(f.a))}</span>` });
    if (!ciega) cols.push({ t: "Diferencia", r: true, cls: "mono", w: "100px", fmt: f => !f.rec ? '<span class="dim">—</span>' : f.dif ? `<b style="color:${f.dif < 0 ? "var(--crit)" : "var(--warn)"}">${f.dif > 0 ? "+" : "−"}${grp(Math.abs(f.dif))}</b>` : `<span style="color:var(--ok)">${icon("check", 'style="width:14px;height:14px"')}</span>` });
    return table({
      h: "calc(100dvh - 520px)",
      cols, rows: recFilas(oc),
      rowCls: f => (ciega || !f.rec ? "" : f.dif < 0 ? "cr" : f.dif > 0 ? "wa" : "")
    });
  }
  function recibirHTML(oc) {
    const r = recDe(oc), ev = r.evid;
    const fb = recFb ? `<div class="hl" style="margin-top:10px;gap:9px;align-items:center">${tag(recFb.k === "ok" ? "Bien" : recFb.k === "wa" ? "Revise" : "Alto", recFb.k === "ok" ? "ok" : recFb.k === "wa" ? "wa" : "cr", recFb.k === "ok" ? "check" : "alert")}<span style="font-size:13.5px">${esc(recFb.t)}</span>${recFb.extra ? `<button class="btn sm" id="recAddExtra" data-art="${recFb.extra}">Registrar como no solicitado</button>` : ""}</div>` : "";
    return `${card({
      title: "Contar contra la orden", hint: r.ciega ? "recepción ciega: la bodega no ve lo pedido" : "dispare el lector · 12*código suma 12 · la cantidad también se corrige a mano",
      actions: `<label class="chipck"><input type="checkbox" id="recCiega" ${r.ciega ? "checked" : ""}><span>Recepción ciega</span></label><button class="btn sm" id="recLlenar">${icon("check")}Llenar con lo pedido</button>`,
      body: `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px">
          <div style="flex:1;min-width:280px"><div class="scan">${icon("scan")}<input id="recScan" type="text" autocomplete="off" placeholder="Dispare el lector sobre el producto"></div><div id="recFb">${fb}</div></div>
          <div style="flex:1;min-width:230px" id="recProg">${progHTML(oc)}</div></div>
        <div id="recTabla">${tablaRec(oc)}</div>`
    })}
      <div class="grid g2" style="align-items:start">
        ${card({
      title: "Llegó algo que no se pidió", hint: "queda con trazabilidad; no se crea en el catálogo",
      body: `${r.extra.length ? table({
        cols: [
          { t: "Qué llegó", fmt: x => esc(x.desc) + (x.artId ? `<span class="sub mono">${esc(artOf(x.artId).cod)}</span>` : "") },
          { t: "Cant.", r: true, cls: "mono", fmt: x => grp(x.cant) },
          { t: "Qué se hace", fmt: x => esc(x.trato) },
          { t: "", fmt: (x, i) => `<button class="iconbtn" data-exdel="${i}" aria-label="Quitar" style="width:26px;height:26px">${icon("x")}</button>` }
        ], rows: r.extra
      }) : `<div class="mut" style="font-size:13px;margin-bottom:10px">Nada por ahora. Si el camión trae algo fuera de la orden, se anota aquí y la compra no lo incluye: se pide la nota de crédito si el proveedor lo facturó.</div>`}
          <div style="display:grid;grid-template-columns:1fr 90px;gap:8px;margin-top:10px">
            <input class="inp" id="exD" placeholder="Descripción o código">
            <input class="inp num" id="exC" placeholder="Cant." inputmode="decimal"></div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <select class="inp" id="exT" style="flex:1"><option>Se devuelve al transportista</option><option>Bodega de devoluciones · espera al proveedor</option></select>
            <button class="btn" id="exOk">${icon("plus")}Anotar</button></div>`
    })}
        ${card({
      title: "Evidencia de la entrega", hint: "sustituye lo que hoy se anota en papel",
      body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${field("Placa del vehículo", `<input class="inp num" id="evP" value="${esc(ev.placa)}" placeholder="CL 000000">`)}
            ${field("Transportista", `<input class="inp" id="evT" value="${esc(ev.transp)}" placeholder="Nombre de quien entrega">`)}</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
            <label class="chipck"><input type="checkbox" id="evS" ${ev.sello ? "checked" : ""}><span>Sello de recibido en la guía</span></label>
            <button class="btn sm" id="evF">${icon("plus")}Foto de la entrega</button>${ev.fotos ? tag(ev.fotos + (ev.fotos > 1 ? " fotos" : " foto"), "ok", "check") : ""}
          </div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--hair)">
            <div style="flex:1" class="mut">${quienHace("recibir") || "Al cerrar, Proveeduría recibe el aviso para registrar la compra."}</div>
            <button class="btn pri" id="recCerrar">${icon("check")}Cerrar recepción</button></div>`
    })}
      </div>`;
  }
  function wireRecibir(v, oc) {
    const r = recDe(oc);
    const scan = $("#recScan", v);
    let pintando = false;
    const repinta = artId => {
      const t = $("#recTabla", v); if (t) { t.innerHTML = tablaRec(oc); bindInputs(); }
      const p = $("#recProg", v); if (p) p.innerHTML = progHTML(oc);
      if (artId) {
        const inp = $(`[data-rc="${artId}"]`, v);
        if (inp) { const tr = inp.closest("tr"); tr.scrollIntoView({ block: "nearest" }); tr.style.transition = "background .6s"; tr.style.background = "var(--accent-soft)"; setTimeout(() => { tr.style.background = ""; }, 700); }
      }
    };
    function bindInputs() {
      $$("[data-rc]", v).forEach(inp => {
        /* el repintado saca el campo del documento y el navegador dispara su «change»: se ignora */
        const set = () => { if (pintando) return; pintando = true; const n = num(inp.value); r.cant[inp.dataset.rc] = n > 0 ? n : 0; repinta(); pintando = false; };
        inp.addEventListener("change", set);
        inp.addEventListener("keydown", e => {
          if (e.key !== "Enter") return;
          e.preventDefault(); set();
          const all = $$("[data-rc]", v), i = all.findIndex(x => x.dataset.rc === inp.dataset.rc);
          const sig = all[i + 1]; if (sig) { sig.focus(); sig.select(); } else if (scan) scan.focus();
        });
      });
    }
    bindInputs();
    if (scan) {
      setTimeout(() => { if (!document.querySelector(".sheet")) scan.focus(); }, 30);
      scan.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (!exige("recibir", "Recibir mercadería")) return;
        const m = /^\s*(\d+(?:[.,]\d+)?)\s*\*\s*(.+)$/.exec(scan.value);
        const n = m ? num(m[1]) : 1, cod = (m ? m[2] : scan.value).trim();
        scan.value = "";
        if (!cod) return;
        const a = buscaArt(cod), l = a && oc.lineas.find(x => x.artId === a.id);
        if (l) {
          r.cant[a.id] = (r.cant[a.id] || 0) + n;
          const x = r.cant[a.id];
          if (x > l.cant && !r.ciega) { recFb = { k: "wa", t: a.desc + ": van " + grp(x) + " y se pidieron " + grp(l.cant) + ". Excede lo pedido." }; pita("wa"); }
          else { recFb = { k: "ok", t: a.desc + (r.ciega ? " · +" + grp(n) : " · " + grp(x) + " de " + grp(l.cant)) }; pita("ok"); }
          repinta(a.id);
        } else if (a) { recFb = { k: "cr", t: a.desc + " no está en esta orden.", extra: a.id }; pita("cr"); }
        else { recFb = { k: "cr", t: "El código «" + cod + "» no existe en el catálogo." }; pita("cr"); }
        const el = $("#recFb", v);
        if (el) {
          const f = recFb;
          el.innerHTML = `<div class="hl" style="margin-top:10px;gap:9px;align-items:center">${tag(f.k === "ok" ? "Bien" : f.k === "wa" ? "Revise" : "Alto", f.k === "ok" ? "ok" : f.k === "wa" ? "wa" : "cr", f.k === "ok" ? "check" : "alert")}<span style="font-size:13.5px">${esc(f.t)}</span>${f.extra ? `<button class="btn sm" id="recAddExtra" data-art="${f.extra}">Registrar como no solicitado</button>` : ""}</div>`;
          const b = $("#recAddExtra", el); if (b) b.addEventListener("click", () => { const d = $("#exD", v); if (d) { d.value = artOf(b.dataset.art).cod + " · " + artOf(b.dataset.art).desc; d.dataset.art = b.dataset.art; const q = $("#exC", v); q.value = n; q.focus(); } });
        }
        scan.focus();
      });
    }
    const bx = $("#recAddExtra", v); if (bx) bx.addEventListener("click", () => { const d = $("#exD", v); d.value = artOf(bx.dataset.art).cod + " · " + artOf(bx.dataset.art).desc; d.dataset.art = bx.dataset.art; $("#exC", v).focus(); });
    const cg = $("#recCiega", v); if (cg) cg.addEventListener("change", () => { r.ciega = cg.checked; recFb = null; A.refresh(); });
    const ll = $("#recLlenar", v); if (ll) ll.addEventListener("click", () => {
      if (!exige("recibir", "Recibir mercadería")) return;
      oc.lineas.forEach(l => { r.cant[l.artId] = l.cant; });
      recFb = { k: "ok", t: "Se llenó con lo pedido. Corrija solo lo que no llegó igual (conteo por excepción)." };
      A.refresh();
    });
    const exOk = $("#exOk", v); if (exOk) exOk.addEventListener("click", () => {
      if (!exige("recibir", "Recibir mercadería")) return;
      const d = $("#exD", v), q = num($("#exC", v).value);
      if (!d.value.trim() || !(q > 0)) return toast("Faltan datos", "Anote qué llegó y cuántas unidades.", "cr");
      const a = d.dataset.art ? artOf(d.dataset.art) : buscaArt(d.value);
      r.extra.push({ desc: a ? a.desc : d.value.trim(), artId: a ? a.id : null, cant: q, trato: $("#exT", v).value });
      recFb = null; A.refresh();
    });
    $$("[data-exdel]", v).forEach(b => b.addEventListener("click", () => { r.extra.splice(+b.dataset.exdel, 1); A.refresh(); }));
    const evP = $("#evP", v), evT = $("#evT", v), evS = $("#evS", v);
    if (evP) evP.addEventListener("input", () => { r.evid.placa = evP.value.trim().toUpperCase(); });
    if (evT) evT.addEventListener("input", () => { r.evid.transp = evT.value.trim(); });
    if (evS) evS.addEventListener("change", () => { r.evid.sello = evS.checked; });
    const evF = $("#evF", v); if (evF) evF.addEventListener("click", () => { r.evid.fotos++; toast("Foto agregada", "Queda ligada a la recepción de " + oc.cons + ".", "ok"); A.refresh(); });
    const ce = $("#recCerrar", v); if (ce) ce.addEventListener("click", () => cerrarRecepcion(oc));
  }

  function cerrarRecepcion(oc) {
    if (!exige("recibir", "Cerrar la recepción")) return;
    const r = recDe(oc), F = recFilas(oc);
    if (!F.some(f => f.rec > 0)) return toast("No hay nada contado", "Escanee o anote lo que llegó antes de cerrar.", "cr");
    if (!r.evid.placa || !r.evid.sello) return toast("Falta la evidencia", "Anote la placa del vehículo y marque el sello de recibido (COM-019).", "cr");
    const difs = F.filter(f => f.dif !== 0);
    difs.forEach(f => { if (!r.trato[f.a.id]) r.trato[f.a.id] = f.dif < 0 ? "pendiente" : "devolver"; });
    openSheet({
      title: "Cerrar la recepción de " + oc.cons, sub: provNom(oc.provId) + " · " + locNom(oc.locId), wide: true,
      body: `<div class="grid g3" style="margin-bottom:14px">
          ${stat("Líneas completas", F.filter(f => f.dif === 0).length + " de " + F.length, null, "var(--ok)")}
          ${stat("Con faltante", F.filter(f => f.dif < 0).length, null, "var(--crit)")}
          ${stat("Con sobrante", F.filter(f => f.dif > 0).length, null, "var(--warn)")}</div>
        ${difs.length ? table({
        cols: [
          { t: "Artículo", fmt: f => esc(f.a.desc) + `<span class="sub mono">${esc(f.a.cod)}</span>` },
          { t: "Pedido", r: true, cls: "mono", fmt: f => grp(f.l.cant) },
          { t: "Recibido", r: true, cls: "mono", fmt: f => grp(f.rec) },
          { t: "Dif.", r: true, cls: "mono", fmt: f => `<b style="color:${f.dif < 0 ? "var(--crit)" : "var(--warn)"}">${f.dif > 0 ? "+" : "−"}${grp(Math.abs(f.dif))}</b>` },
          { t: "Qué se hace", fmt: f => `<select class="inp" data-tr="${f.a.id}" style="padding:4px 8px">${TRATO[f.dif < 0 ? "falta" : "sobra"].map(o => `<option value="${o[0]}" ${r.trato[f.a.id] === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select>` }
        ], rows: difs, rowCls: f => (f.dif < 0 ? "cr" : "wa")
      }) : `<div class="stepbar ok"><div class="sbt"><b>Todo llegó como se pidió</b><span>Sin faltantes ni sobrantes.</span></div></div>`}
        ${r.extra.length ? `<div class="mut" style="font-size:13px;margin-top:12px">${r.extra.length} artículo${r.extra.length > 1 ? "s" : ""} no solicitado${r.extra.length > 1 ? "s" : ""} con trazabilidad; la compra no los incluye.</div>` : ""}
        <div class="mut" style="font-size:12.5px;margin-top:12px">Placa ${esc(r.evid.placa)} · ${esc(r.evid.transp || "transportista sin anotar")} · sello ✓ · ${r.evid.fotos} foto${r.evid.fotos === 1 ? "" : "s"}</div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="crX">Seguir contando</button><button class="btn pri" id="crOk">${icon("check")}Cerrar recepción</button>`,
      after: root => {
        $$("[data-tr]", root).forEach(s => s.addEventListener("change", () => { r.trato[s.dataset.tr] = s.value; }));
        $("#crX", root).addEventListener("click", closeSheet);
        $("#crOk", root).addEventListener("click", () => {
          const falt = F.filter(f => f.dif < 0).length, sob = F.filter(f => f.dif > 0).length;
          r.cerrada = true; r.por = D.sesion.nom; r.fecha = D.ahora();
          oc.estado = falt ? "Recibida parcial" : "Recibida";
          anotar("Recibió mercadería", oc.cons + " · " + F.filter(f => f.dif === 0).length + " de " + F.length + " líneas completas" + (falt ? " · " + falt + " con faltante" : "") + (sob ? " · " + sob + " con sobrante" : "") + (r.extra.length ? " · " + r.extra.length + " no solicitados" : ""), oc, "Aprobada", oc.estado, "Baja");
          closeSheet();
          toast("Recepción cerrada", "Quedó con placa, sello y fotos. Proveeduría ya puede registrar la compra contra la factura.", "ok");
          A.refresh();
        });
      }
    });
  }

  function resumenRec(oc) {
    const r = oc.rec;
    if (!r) return card({ body: empty("scan", "Sin recepción", "Esta orden no pasó por la bodega.") });
    const F = recFilas(oc).filter(f => f.dif !== 0);
    return card({
      title: "Recepción cerrada", hint: (r.por || "") + " · " + fecha(r.fecha || oc.fecha),
      body: `${F.length ? table({
        cols: [
          { t: "Artículo", fmt: f => esc(f.a.desc) },
          { t: "Pedido", r: true, cls: "mono", fmt: f => grp(f.l.cant) },
          { t: "Recibido", r: true, cls: "mono", fmt: f => grp(f.rec) },
          { t: "Qué se hizo", fmt: f => esc(((TRATO[f.dif < 0 ? "falta" : "sobra"].find(o => o[0] === r.trato[f.a.id]) || [0, "—"])[1])) }
        ], rows: F, rowCls: f => (f.dif < 0 ? "cr" : "wa")
      }) : `<div class="mut">Todo llegó como se pidió.</div>`}
        <div class="ficha" style="border-top:1px solid var(--hair);margin-top:10px">
          ${fichaCell("Placa", esc(r.evid.placa || "—"))}${fichaCell("Transportista", `<span style="font-family:var(--ui);font-size:13.5px">${esc(r.evid.transp || "—")}</span>`)}
          ${fichaCell("Sello", r.evid.sello ? tag("Capturado", "ok", "check") : tag("Sin sello", "cr"))}${fichaCell("Fotos", r.evid.fotos)}
          ${fichaCell("No solicitados", (r.extra || []).length)}</div>`
    });
  }

  /* ── repartir a los locales ── */
  function lineasAplicadas(oc) {
    if (oc.aplicada && oc.aplicada.lineas) return oc.aplicada.lineas;
    return oc.lineas.map(l => ({ artId: l.artId, cant: oc.rec ? Math.min(l.cant, oc.rec.cant[l.artId] || 0) : l.cant }));
  }
  function sugeridoReparto(oc) {
    const out = {};
    lineasAplicadas(oc).forEach(l => {
      const nec = {};
      let tot = 0;
      D.tiendas.forEach(t => { const e = D.stock(l.artId, t.id); if (!e) return; const n = Math.max(0, (e.min || 10) * 2 - e.cant); nec[t.id] = n; tot += n; });
      const k = tot > l.cant ? l.cant / tot : 1;
      out[l.artId] = {};
      Object.keys(nec).forEach(t => { out[l.artId][t] = Math.floor(nec[t] * k); });
    });
    return out;
  }
  function repartoHTML(oc) {
    oc.distB = oc.distB || sugeridoReparto(oc);
    const L = lineasAplicadas(oc).filter(l => l.cant > 0);
    const queda = l => l.cant - D.tiendas.reduce((s, t) => s + ((oc.distB[l.artId] || {})[t.id] || 0), 0);
    const cols = [{ t: "Artículo", w: "220px", fmt: l => `${esc(artOf(l.artId).desc)}<span class="sub mono">${esc(artOf(l.artId).cod)} · entró ${grp(l.cant)}</span>` }]
      .concat(D.tiendas.map(t => ({
        t: t.nom, r: true, cls: "mono", w: "82px", fmt: l => {
          const e = D.stock(l.artId, t.id);
          if (!e) return `<span class="dim" title="El artículo no está habilitado en ${esc(t.nom)}">—</span>`;
          const vv = (oc.distB[l.artId] || {})[t.id] || 0;
          return `<input class="inp num" data-dq="${l.artId}|${t.id}" value="${vv || ""}" placeholder="0" inputmode="numeric" aria-label="${esc(t.nom)}" style="width:62px;text-align:right;padding:3px 6px"><span class="sub" title="existencia / mínimo">${grp(e.cant)}/${grp(e.min || 10)}</span>`;
        }
      })))
      .concat([{ t: "Queda en " + locNom(oc.locId), r: true, cls: "mono", w: "110px", fmt: l => { const q = queda(l); return `<b style="color:${q < 0 ? "var(--crit)" : "var(--ink)"}">${grp(q)}</b>`; } }]);
    const negativos = L.some(l => queda(l) < 0);
    const nTr = D.tiendas.filter(t => L.some(l => ((oc.distB[l.artId] || {})[t.id] || 0) > 0)).length;
    return card({
      title: "Repartir a los locales", hint: "sugerido por mínimos y existencia de cada tienda · debajo de cada casilla: existencia/mínimo",
      actions: `<button class="btn sm" id="dsSug">${icon("sparkle")}Usar el sugerido</button><button class="btn sm" id="dsNada">Todo queda en ${esc(locNom(oc.locId))}</button>`,
      body: table({ h: "calc(100dvh - 470px)", cols, rows: L, rowCls: l => (queda(l) < 0 ? "cr" : "") }) +
        `<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap">
          <div style="flex:1" class="mut">${negativos ? '<span style="color:var(--crit)">Se reparte más de lo que entró en alguna línea.</span>' : nTr + " traslado" + (nTr === 1 ? "" : "s") + " saldrán en tránsito; cada tienda los recibe con escáner en Inventarios › Traslados."}</div>
          ${quienHace("repartir")}
          <button class="btn pri" id="dsOk" ${negativos || !nTr ? "disabled" : ""}>${icon("route")}Generar ${nTr} traslado${nTr === 1 ? "" : "s"}</button></div>`
    });
  }
  function wireReparto(v, oc) {
    $$("[data-dq]", v).forEach(inp => inp.addEventListener("change", () => {
      const [art, loc] = inp.dataset.dq.split("|"), n = num(inp.value);
      (oc.distB[art] = oc.distB[art] || {})[loc] = n > 0 ? Math.round(n) : 0;
      A.refresh();
    }));
    const sg = $("#dsSug", v); if (sg) sg.addEventListener("click", () => { oc.distB = sugeridoReparto(oc); A.refresh(); });
    const nd = $("#dsNada", v); if (nd) nd.addEventListener("click", () => {
      if (!exige("repartir", "Repartir la compra")) return;
      oc.dist = { por: D.sesion.nom, f: D.ahora(), traslados: [] };
      anotar("Dejó la compra en " + locNom(oc.locId), oc.cons + " · sin reparto", oc);
      A.refresh();
    });
    const ok = $("#dsOk", v); if (ok) ok.addEventListener("click", () => {
      if (!exige("repartir", "Repartir la compra")) return;
      if (!IX().crearTraslado) return toast("Inventarios no está disponible", "No se pudieron generar los traslados.", "cr");
      const L = lineasAplicadas(oc), hechos = [];
      D.tiendas.forEach(t => {
        const lineas = L.map(l => ({ artId: l.artId, cant: (oc.distB[l.artId] || {})[t.id] || 0 })).filter(x => x.cant > 0);
        if (lineas.length) hechos.push(IX().crearTraslado(oc.locId, t.id, lineas, { nom: D.sesion.nom, rol: D.sesion.rol }).cons);
      });
      oc.dist = { por: D.sesion.nom, f: D.ahora(), traslados: hechos };
      anotar("Repartió la compra a los locales", oc.cons + " · " + hechos.join(", "), oc);
      toast(hechos.length + " traslados en tránsito", hechos.join(", ") + ". Cada tienda los recibe en Inventarios › Traslados.", "ok");
      A.refresh();
    });
  }

  /* ══ REGISTRAR COMPRA ════════════════════════════════════════
     Conciliación de tres vías: lo pedido (orden), lo recibido (bodega)
     y lo facturado (XML del proveedor). Entra al inventario lo que se
     recibió, al precio de la factura; el costo promedio se recalcula;
     sale un solo asiento y una sola cuenta por pagar; el XML queda
     ligado a la compra y su mensaje de receptor, total o parcial.
     Lo que faltó queda en una orden abierta por lo pendiente (COM-007). */
  let regSel = null, regOtras = false;
  const regXml = {};
  const tolMonto = m => Math.max(1000, Math.abs(m) * 0.005);

  function xmlsDe(oc) {
    return D.recibidos.filter(r => r.provId === oc.provId && /Factura/.test(r.tipo) && !r.compra &&
      (r.estado === "Sin aceptar" || r.esperaCompra === oc.cons) && (!r.ocLigada || r.ocLigada === oc.cons))
      .sort((a, b) => (b.ocLigada === oc.cons) - (a.ocLigada === oc.cons));
  }
  function xmlSel(oc) {
    const L = xmlsDe(oc);
    const r = L.find(x => x.id === regXml[oc.cons]) || L[0] || null;
    if (r) regXml[oc.cons] = r.id;
    return r;
  }
  function cotejo(oc, r) {
    const rec = oc.rec || { cant: {}, trato: {} };
    const filas = oc.lineas.map(l => {
      const a = artOf(l.artId);
      const recib = rec.cant[l.artId] || 0;
      const acept = recib > l.cant && rec.trato[l.artId] !== "aceptar" ? l.cant : recib;
      const x = r && r.lineas ? r.lineas.find(y => y.artId === l.artId) : null;
      const fact = x ? x.cant : r && !r.lineas ? l.cant : 0;
      const precio = x ? x.costo : l.costo;
      const reg = Math.min(acept, fact);
      const difP = l.costo ? (precio / l.costo - 1) * 100 : 0;
      const varV = a.costo ? (precio / a.costo - 1) * 100 : 0;
      const fuera = Math.abs(varV) > POL.topeVar && !l.autReg;
      let res, k;
      if (fuera) { res = "Costo fuera de ±" + POL.topeVar + " %"; k = "cr"; }
      else if (!fact) { res = "No viene en la factura"; k = "wa"; }
      else if (fact > acept) { res = "Facturó " + grp(fact - acept) + " de más"; k = "wa"; }
      else if (fact < acept) { res = "Facturó " + grp(acept - fact) + " de menos"; k = "wa"; }
      else if (Math.abs(difP) > POL.tolPrecio) { res = "Precio distinto a la orden"; k = "wa"; }
      else { res = "Cuadra"; k = "ok"; }
      const q = Object.values(D.existencias[l.artId] || {}).reduce((s, e) => s + Math.max(0, e.cant), 0);
      const nuevo = reg > 0 && oc.tipo !== "Autoconsumo" ? Math.round((q * a.costo + reg * precio) / (q + reg)) : a.costo;
      return { l, a, recib, acept, fact, precio, reg, difP, varV, fuera, res, k, nuevo, pend: Math.max(0, l.cant - recib) };
    });
    const ajenas = r && r.lineas ? r.lineas.filter(y => !oc.lineas.some(l => l.artId === y.artId)) : [];
    const lin = filas.filter(f => f.reg > 0).map(f => ({ artId: f.a.id, cant: f.reg, costo: f.precio }));
    const t = D.totalesCompra(lin);
    const dif = r ? r.monto - t.total : 0;
    return { filas, ajenas, lin, t, dif, total: !!r && Math.abs(dif) <= tolMonto(t.total) };
  }

  A.screen("registrar-compra", {
    title: "Registrar compra",
    sub: () => OCS().filter(recibida).length + " recepciones esperan su factura · la compra entra una sola vez, con su XML",
    prep(arg) { if (arg) { regSel = arg; S.arg = null; } },
    render(v) {
      const O = OCS().sort(ordenFecha);
      const porReg = O.filter(recibida);
      const antes = O.filter(o => o.estado === "Aprobada" && D.recibidos.some(r => r.ocLigada === o.cons && !r.compra));
      if (!regSel || !ocDe(regSel)) regSel = (porReg[0] || {}).cons || null;
      const oc = regSel ? ocDe(regSel) : null;
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div class="mut" style="font-size:12px;margin-bottom:6px">Recibidas · por registrar</div>
            ${listaOC(porReg, regSel, { estado: false, vacioT: "Nada por registrar", vacioP: "Cuando la bodega cierra una recepción, la orden aparece aquí." })}
            ${antes.length ? `<div class="mut" style="font-size:12px;margin:14px 0 6px">Llegó la factura, falta la mercadería</div>${listaOC(antes, regSel, { estado: false })}` : ""}`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">${oc ? vistaReg(oc) : card({ body: empty("file", "Nada por registrar", "Las recepciones cerradas aparecen a la izquierda.") })}</div>
      </div>`;
    },
    wire(v) {
      A.wireIr(v); wirePasos(v);
      $$("[data-oc]", v).forEach(b => b.addEventListener("click", () => { regSel = b.dataset.oc; A.refresh(); }));
      const oc = regSel && ocDe(regSel);
      if (oc && recibida(oc)) wireReg(v, oc);
    }
  });

  function vistaReg(oc) {
    const cab = pasos(oc) + siguiente(oc, "registrar-compra");
    if (regOtras && regOtras !== oc.cons) regOtras = false;
    if (oc.estado === "Aplicada") return cab + resumenCompra(oc);
    if (!recibida(oc)) return cab + card({ body: empty("scan", oc.estado === "Anulada" ? "Orden anulada" : "Falta la recepción", oc.estado === "Anulada" ? "No se registra." : "La compra se registra contra lo que la bodega contó. Primero se recibe.") });
    const r = xmlSel(oc), X = cotejo(oc, r), Lt = xmlsDe(oc);
    const lig = Lt.filter(x => x.ocLigada === oc.cons);
    const L = regOtras || !lig.length ? Lt : Lt.filter(x => x.ocLigada === oc.cons || (r && x.id === r.id));
    const plazoTag = n => tag(n < 0 ? "plazo vencido" : n <= 3 ? "vence en " + n + " d" : n + " d para aceptar", n <= 3 ? "cr" : "mu");
    const bl = X.filas.filter(f => f.fuera && f.reg > 0).length;
    const mismo = oc.rec && oc.rec.por === D.sesion.nom;
    const pendientes = X.filas.filter(f => f.pend > 0 && (oc.rec.trato[f.a.id] || "pendiente") === "pendiente");
    const cortos = X.filas.filter(f => f.pend > 0 && oc.rec.trato[f.a.id] === "corto");
    const vence = r ? r.venceEn : null;
    const cta = cod => esc(cod) + ` <span class="mut">${esc((D.ctaByCod[cod] || {}).nom || "")}</span>`;
    const xmlCard = card({
      title: "Factura electrónica del proveedor", hint: "se detecta sola del buzón de facturas; la clave de 50 dígitos no se repite",
      body: L.length ? `<div class="reclist">${L.map(x => `<label class="rec" style="cursor:pointer;align-items:center">
            <input type="radio" name="rgx" value="${x.id}" ${r && r.id === x.id ? "checked" : ""} style="margin-right:4px">
            <div style="flex:1;min-width:0"><div class="b num" style="font-size:12.5px;word-break:break-all">${esc(x.clave)}</div>
              <div class="mut" style="font-size:12px">${fecha(x.fecha)} · ${x.ocLigada === oc.cons ? "trae la orden " + esc(oc.cons) : "sin orden en el XML"} · mensaje de receptor: ${esc(x.estado)}</div></div>
            <div style="text-align:right"><b class="num">${c(x.monto)}</b><div>${x.venceEn != null ? plazoTag(x.venceEn) : ""}</div></div></label>`).join("")}</div>
           ${Lt.length > L.length ? `<button class="btn sm" id="rgOtras" style="margin-top:8px">Ver ${Lt.length - L.length} factura${Lt.length - L.length > 1 ? "s" : ""} más de este proveedor sin orden</button>` : ""}`
        : `${empty("file", "Todavía no llegó la factura", "La compra no se registra sin su comprobante (COM-005). Cuando entre al buzón, se liga sola a esta orden.")}
           <div style="display:flex;justify-content:center;margin-top:-6px"><button class="btn" id="rgBuzon">${icon("arrowdown")}Revisar el buzón de facturas</button></div>`
    });
    if (!r) return cab + xmlCard;
    const cols = [
      { t: "Artículo", fmt: f => `${esc(f.a.desc)}<span class="sub mono">${esc(f.a.cod)}</span>` },
      { t: "Pedido", r: true, cls: "mono", fmt: f => grp(f.l.cant) + `<span class="sub">a ${grp(f.l.costo)}</span>` },
      { t: "Recibido", r: true, cls: "mono", fmt: f => `<span style="${f.recib !== f.l.cant ? "color:" + (f.recib < f.l.cant ? "var(--crit)" : "var(--warn)") + ";font-weight:700" : ""}">${grp(f.recib)}</span>` },
      { t: "Facturado", r: true, cls: "mono", fmt: f => `<span style="${f.fact !== f.acept ? "color:var(--warn);font-weight:700" : ""}">${grp(f.fact)}</span><span class="sub" style="${Math.abs(f.difP) > POL.tolPrecio ? "color:var(--warn);font-weight:700" : ""}">a ${grp(f.precio)}</span>` },
      { t: "Entra", r: true, cls: "mono", fmt: f => `<b>${grp(f.reg)}</b>` },
      /* la venta toma el costo vigente; lo que cambia el costo es la compra: antes → nuevo en cada línea */
      { t: "Costo promedio · antes → nuevo", r: true, cls: "mono", fmt: f => !f.reg || oc.tipo === "Autoconsumo" ? `<span class="dim">${grp(f.a.costo)} · no cambia</span>`
        : `${grp(f.a.costo)} → <b>${grp(f.nuevo)}</b><span class="sub" style="${f.nuevo !== f.a.costo ? "color:" + (f.nuevo > f.a.costo ? "var(--warn)" : "var(--ok)") : ""}">${f.nuevo === f.a.costo ? "sin cambio" : (f.nuevo > f.a.costo ? "+" : "−") + grp(Math.abs(f.nuevo - f.a.costo)) + " (" + dec(Math.abs(f.nuevo - f.a.costo) / (f.a.costo || 1) * 100, 1) + " %)"}</span>` },
      { t: "Resultado", fmt: (f, i) => tag(f.res, f.k, f.k === "ok" ? "check" : "alert") + (f.fuera && f.reg ? ` <button class="btn sm" data-autr="${i}" style="padding:2px 8px">Autorizar</button>` : f.l.autReg ? `<span class="sub" style="color:var(--ok)">autorizó ${esc(f.l.autReg.por.split(" ")[0])}</span>` : "") }
    ];
    const asiento = [
      { cta: oc.tipo === "Autoconsumo" ? "6-01-02-005" : "1-01-04-001", debe: X.t.sub, haber: 0, n: oc.tipo === "Autoconsumo" ? "uso interno · " + (oc.area || "taller") : "mercadería recibida" },
      { cta: "1-01-05-001", debe: X.t.iva, haber: 0, n: "crédito fiscal por tarifa" },
      { cta: "2-01-01-001", debe: 0, haber: X.t.total, n: provNom(oc.provId) + " · " + oc.plazo + " días" }
    ];
    return cab + xmlCard + card({
      title: "Cotejo de tres vías", hint: "orden · recepción · factura · precio con tolerancia de ±" + POL.tolPrecio + " %",
      body: table({ h: "calc(100dvh - 470px)", cols, rows: X.filas, rowCls: f => (f.k === "cr" ? "cr" : f.k === "wa" ? "wa" : "") }) +
        (X.ajenas.length ? `<div class="stepbar" style="margin-top:12px"><div class="sbt"><b>${X.ajenas.length} línea${X.ajenas.length > 1 ? "s" : ""} de la factura no están en la orden</b><span>${X.ajenas.map(y => esc(artOf(y.artId).desc) + " × " + grp(y.cant)).join(" · ")}. No entran; se pide nota de crédito.</span></div></div>` : "")
    }) + `<div class="grid g2" style="align-items:start">` + card({
      title: "Resultado",
      body: `<dl class="kv">
          <dt>Factura del proveedor</dt><dd class="num">${c(r.monto)}</dd>
          <dt>Entra a la compra</dt><dd class="num"><b>${c(X.t.total)}</b> <span class="mut">(${X.lin.length} líneas)</span></dd>
          <dt>Diferencia</dt><dd class="num" style="color:${X.total ? "var(--ok)" : "var(--warn)"}">${X.total ? "₡0 · cuadra" : c(X.dif) + (X.dif > 0 ? " · se pide nota de crédito" : " · el proveedor facturó de menos")}</dd>
          <dt>Mensaje de receptor</dt><dd>${X.total ? tag("Aceptación total", "ok", "check") : X.dif > 0 ? tag("Aceptación parcial por " + c(X.t.total), "wa") : tag("Aceptación total · revise lo facturado de menos", "wa")}${vence != null ? ` <span class="mut" style="font-size:12px">· ${vence < 0 ? "el plazo ya venció: el crédito fiscal está en riesgo" : vence + " días hábiles para enviarlo"}</span>` : ""}</dd>
          <dt>Lo que faltó</dt><dd>${pendientes.length ? pendientes.length + " línea" + (pendientes.length > 1 ? "s" : "") + " quedan en una orden abierta por lo pendiente" : ""}${cortos.length ? (pendientes.length ? " · " : "") + cortos.length + " se cierran cortas" : ""}${!pendientes.length && !cortos.length ? "Nada" : ""}</dd>
        </dl>`
    }) + card({
      title: "Asiento que se genera", hint: "una sola vez: el XML queda ligado a esta compra",
      body: table({
        cols: [
          { t: "Cuenta", fmt: x => cta(x.cta) + `<span class="sub">${esc(x.n)}</span>` },
          { t: "Debe", r: true, cls: "mono", fmt: x => (x.debe ? grp(x.debe) : "") },
          { t: "Haber", r: true, cls: "mono", fmt: x => (x.haber ? grp(x.haber) : "") }
        ], rows: asiento,
        foot: [{ v: "Suma" }, { v: grp(X.t.sub + X.t.iva), r: true, cls: "mono" }, { v: grp(X.t.total), r: true, cls: "mono" }]
      }) + `<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">
          <div style="flex:1" class="mut" style="font-size:12.5px">${mismo ? '<span style="color:var(--crit)">Usted cerró la recepción: la factura la registra otra persona.</span>' : bl ? '<span style="color:var(--crit)">' + bl + " línea" + (bl > 1 ? "s" : "") + " con el costo fuera de rango: falta la autorización.</span>" : quienHace("registrar") || "Todo listo."}</div>
          <button class="btn pri" id="rgAplicar" ${bl || mismo || !X.lin.length ? "disabled" : ""}>${icon("check")}Aplicar compra</button></div>`
    }) + `</div>`;
  }

  function wireReg(v, oc) {
    const ot = $("#rgOtras", v); if (ot) ot.addEventListener("click", () => { regOtras = oc.cons; A.refresh(); });
    $$('input[name="rgx"]', v).forEach(x => x.addEventListener("change", () => { regXml[oc.cons] = x.value; A.refresh(); }));
    const bz = $("#rgBuzon", v); if (bz) bz.addEventListener("click", () => {
      const p = D.provById[oc.provId], hoy = D.ahora();
      const xml = oc.lineas.map(l => ({ artId: l.artId, cant: l.cant, costo: l.costo }));
      const t = D.totalesCompra(xml);
      const dd = n => String(n).padStart(2, "0");
      const cons = "00100001010" + String(D.recibidos.length + 20000).padStart(10, "0");
      D.recibidos.unshift({
        id: "RX" + D.recibidos.length,
        clave: "506" + dd(hoy.getDate()) + dd(hoy.getMonth() + 1) + String(hoy.getFullYear()).slice(2) + p.ced.replace(/\D/g, "").padStart(12, "0") + cons + "1" + String(10000000 + D.recibidos.length * 7919 % 89999999).slice(0, 8),
        provId: p.id, fecha: hoy, monto: t.total, iva: t.iva, lineas: xml, tipo: "Factura electrónica",
        estado: "Sin aceptar", venceEn: 8, ocLigada: oc.cons
      });
      toast("Llegó la factura de " + p.nom, "Se detectó en el buzón y se ligó a " + oc.cons + " por la referencia de la orden.", "ok");
      A.refresh();
    });
    $$("[data-autr]", v).forEach(b => b.addEventListener("click", () => {
      if (!exige("autorizar", "Autorizar un costo fuera de rango")) return;
      const f = cotejo(oc, xmlSel(oc)).filas[+b.dataset.autr];
      f.l.autReg = { por: D.sesion.nom, f: D.ahora() };
      anotar("Autorizó costo fuera de rango", oc.cons + " · " + f.a.desc + " · al registrar la factura", oc, "₡" + grp(f.a.costo), "₡" + grp(f.precio), "Alta");
      A.refresh();
    }));
    const ap = $("#rgAplicar", v); if (ap) ap.addEventListener("click", () => aplicarCompra(oc));
  }

  function aplicarCompra(oc) {
    if (!exige("registrar", "Registrar compras")) return;
    const estAntes = oc.estado;
    if (oc.rec && oc.rec.por === D.sesion.nom) return toast("Separación de funciones", "Quien cerró la recepción no registra la factura. Cambie de usuario.", "cr");
    const r = xmlSel(oc);
    if (!r) return toast("Falta la factura", "La compra se registra con su XML.", "cr");
    const X = cotejo(oc, r);
    if (X.filas.some(f => f.fuera && f.reg > 0)) return toast("Hay costos fuera de rango", "Falta la autorización de Gerencia.", "cr");
    if (!X.lin.length) return toast("No entra nada", "Ninguna línea tiene cantidad recibida y facturada.", "cr");
    try { D.exigePeriodoAbierto(D.ahora()); } catch (e) { return toast("No se aplicó la compra", e.message, "cr"); }
    const ahora = D.ahora(), costos = [];
    if (oc.tipo !== "Autoconsumo") X.lin.forEach(l => {
      const cp = D.costoPromedio(l.artId, l.cant, l.costo);
      if (cp && cp.antes !== cp.despues) costos.push({ artId: l.artId, antes: cp.antes, despues: cp.despues });
      D.mover(l.artId, oc.locId, l.cant, "Compra", oc.cons, ahora, "FE …" + r.clave.slice(-8));
    });
    const t = X.t;
    let asiento = null;
    try {
      asiento = D.asentar(ahora, oc.cons, "Compra a " + provNom(oc.provId) + " · FE …" + r.clave.slice(-8), [
        { cta: oc.tipo === "Autoconsumo" ? "6-01-02-005" : "1-01-04-001", debe: t.sub, haber: 0 },
        { cta: "1-01-05-001", debe: t.iva, haber: 0 },
        { cta: "2-01-01-001", debe: 0, haber: t.total }
      ]);
    } catch (e) { return toast("No se aplicó la compra", e.message, "cr"); }
    D.provById[oc.provId].saldo += t.total;
    if (!oc.pedido) oc.pedido = { sub: oc.sub, iva: oc.iva, total: oc.total };
    Object.assign(oc, t);
    oc.montoAceptado = t.total;
    oc.estado = "Aplicada";
    oc.facturaProv = { num: r.clave, monto: r.monto };
    oc.aplicada = { por: D.sesion.nom, fecha: ahora, xml: r.id, clave: r.clave, asiento: asiento && asiento.id, lineas: X.lin, costos, dif: X.total ? 0 : X.dif, mensaje: X.total ? "Aceptación total" : X.dif > 0 ? "Aceptación parcial" : "Aceptación total" };
    /* el XML queda ligado: su cuenta por pagar es la de esta compra */
    r.ocLigada = oc.cons; r.compra = oc.cons;
    if (r.estado === "Sin aceptar") D.aceptarRecibido(r, oc.aplicada.mensaje === "Aceptación parcial" ? "Aceptado parcial" : "Aceptado");
    else r.asiento = "en " + oc.cons;
    r.montoAceptado = t.total;
    /* lo que faltó y el proveedor todavía trae: orden abierta por lo pendiente */
    const pend = X.filas.filter(f => f.pend > 0 && (oc.rec.trato[f.a.id] || "pendiente") === "pendiente");
    if (pend.length) {
      const bo = nuevaOC(oc.provId, oc.locId, pend.map(f => ({ a: f.a.id, c: f.pend, k: f.l.costo, v: f.l.var })), "Aprobada");
      bo.creadoPor = oc.creadoPor; bo.aprobadoPor = oc.aprobadoPor; bo.plazo = oc.plazo; bo.neg = oc.neg; bo.tipo = oc.tipo; bo.area = oc.area; bo.origen = oc.cons;
      bo.hist = [{ f: ahora, quien: D.sesion.nom, acc: "Se abrió por lo pendiente de " + oc.cons }];
      oc.backorder = bo.cons;
    }
    anotar("Aplicó compra", oc.cons + " · FE …" + r.clave.slice(-8) + " · ₡" + grp(t.total) + (oc.backorder ? " · pendiente en " + oc.backorder : ""), oc, estAntes, "Aplicada");
    toast("Compra aplicada", (oc.tipo === "Autoconsumo" ? "Se cargó al gasto de " + (oc.area || "taller") : "Entró la mercadería a " + locNom(oc.locId) + (costos.length ? " y cambió el costo promedio de " + costos.length + " artículos" : "")) + ". Un asiento, una cuenta por pagar y el mensaje de receptor: " + oc.aplicada.mensaje.toLowerCase() + ".", "ok");
    A.refresh();
  }

  function resumenCompra(oc) {
    const ap = oc.aplicada || {};
    if (ap.seed) return card({ body: empty("check", "Compra aplicada antes de esta sesión", "Su asiento y su cuenta por pagar están en Contabilidad y en Cobros y pagos.") });
    return card({
      title: "Compra aplicada", hint: esc(ap.por || "") + " · " + fecha(ap.fecha),
      actions: `<button class="btn sm" data-ir="cob-estado-prov|${oc.provId}">Estado de cuenta del proveedor</button>`,
      body: `<dl class="kv">
          <dt>Factura</dt><dd class="num" style="font-size:12px;word-break:break-all">${esc(ap.clave || "—")}</dd>
          <dt>Total registrado</dt><dd class="num"><b>${c(oc.total)}</b>${oc.pedido && oc.pedido.total !== oc.total ? ` <span class="mut">(la orden era de ${c(oc.pedido.total)})</span>` : ""}</dd>
          <dt>Mensaje de receptor</dt><dd>${tag(ap.mensaje || "—", ap.mensaje === "Aceptación parcial" ? "wa" : "ok")}${ap.dif > 0 ? ` <span class="mut">· nota de crédito por ${c(ap.dif)} pedida al proveedor</span>` : ""}</dd>
          <dt>Asiento</dt><dd class="num">${esc(ap.asiento || "—")}</dd>
          <dt>Lo pendiente</dt><dd>${oc.backorder ? `<button class="btn sm" data-paso="ordenes|${esc(oc.backorder)}">${esc(oc.backorder)}</button>` : "Nada"}</dd></dl>
        ${ap.costos && ap.costos.length ? `<div style="margin-top:12px">${table({
        cols: [
          { t: "Costo promedio que cambió", fmt: x => esc(artOf(x.artId).desc) },
          { t: "Antes", r: true, cls: "mono", fmt: x => grp(x.antes) },
          { t: "Ahora", r: true, cls: "mono", fmt: x => `<b>${grp(x.despues)}</b>` }
        ], rows: ap.costos
      })}<div class="mut" style="font-size:12.5px;margin-top:6px">Los precios que pierden margen quedan para aprobar en Inventarios › Catálogo.</div></div>` : ""}`
    });
  }

  /* ══ COTIZAR A PROVEEDORES («subasta») ═══════════════════════
     (1) se escogen los proveedores y se envía la lista en su formato;
     (2) las respuestas se cargan sin digitar y el cuadro se arma solo
     (COM-013); (3) la sugerencia pesa precio, plazo y cumplimiento, se
     explica siempre (COM-014) y se adjudica por línea: salen las
     órdenes registradas, una por proveedor. */
  const SUBS = [];
  let subSel = null, subN = 118;
  function nuevaSub(items, locId, titulo, provs) {
    const s = {
      id: "SUB-2026-" + String(subN++).padStart(6, "0"), t: titulo || "Lista de compra", destino: locId || "CD",
      cierra: "lunes 21 set · 4:00 p.m.", resp: GENTE.compra, items, provs: provs || [], paso: 0, ofertas: null, adj: {}, modo: null, ocs: []
    };
    SUBS.unshift(s);
    subSel = s.id;
    return s;
  }
  (function semilla() {
    const cant = { "FER-00915": 600, "FER-00917": 400, "FER-01120": 2400, "FER-01455": 1200, "FER-03004": 180, "FER-08010": 90 };
    const items = Object.keys(cant).map(cd => { const a = D.articulos.find(x => x.cod === cd); return a ? { artId: a.id, cant: cant[cd] } : null; }).filter(Boolean);
    nuevaSub(items, "CD", "Fontanería y riego", ["P1", "P5", "P9", "P8"]);
  })();
  const subDe = () => SUBS.find(s => s.id === subSel) || SUBS[0];
  /* respuesta simulada de cada proveedor: estable entre sesiones; un
     proveedor que no es de la línea deja renglones sin cotizar */
  function cargarOfertas(s) {
    s.ofertas = {};
    s.provs.forEach((pid, i) => {
      s.ofertas[pid] = {};
      s.items.forEach((it, j) => {
        const a = artOf(it.artId), p = D.provById[pid];
        const ajeno = a.provId && a.provId !== pid && ["Fontanería", "Accesorios", "Jardín", "Agro", "Prefabricados"].indexOf(p.linea) < 0;
        if (ajeno && (i + j) % 3 === 0) { s.ofertas[pid][it.artId] = null; return; }
        s.ofertas[pid][it.artId] = Math.round(a.costo * (1 + (((a.id.charCodeAt(1) + j * 5 + i * 7) % 11) - 5) / 100));
      });
    });
  }
  /* costo efectivo: el precio, menos el valor del plazo (1 % al mes) y castigado si el proveedor falla entregas */
  const efectivo = (s, pid, artId) => {
    const pr = s.ofertas[pid][artId];
    if (pr == null) return Infinity;
    const p = D.provById[pid], d = desempeno(pid);
    return pr * (1 - (p.plazo / 30) * 0.01) * (1 + (100 - d.otif) / 100 * 0.5);
  };
  function adjudicar(s, modo) {
    s.modo = modo;
    s.items.forEach(it => {
      let best = null, bv = Infinity;
      s.provs.forEach(pid => {
        const val = modo === "precio" ? (s.ofertas[pid][it.artId] == null ? Infinity : s.ofertas[pid][it.artId]) : efectivo(s, pid, it.artId);
        if (val < bv) { bv = val; best = pid; }
      });
      s.adj[it.artId] = best;
    });
  }
  function explicacion(s) {
    const barato = {};
    s.items.forEach(it => {
      let b = null, bv = Infinity;
      s.provs.forEach(pid => { const x = s.ofertas[pid][it.artId]; if (x != null && x < bv) { bv = x; b = pid; } });
      barato[it.artId] = b;
    });
    const dist = s.items.filter(it => s.adj[it.artId] && s.adj[it.artId] !== barato[it.artId]);
    const extra = dist.reduce((t, it) => t + (s.ofertas[s.adj[it.artId]][it.artId] - s.ofertas[barato[it.artId]][it.artId]) * it.cant, 0);
    if (!dist.length) return "Coinciden precio y conveniencia: en todas las líneas gana el precio más bajo.";
    const quien = [...new Set(dist.map(it => s.adj[it.artId]))];
    return quien.map(pid => {
      const p = D.provById[pid], d = desempeno(pid), ls = dist.filter(it => s.adj[it.artId] === pid);
      const otro = D.provById[barato[ls[0].artId]], d2 = desempeno(otro.id);
      return `<strong>${esc(p.nom.split(" ")[0])}</strong> en ${ls.length} línea${ls.length > 1 ? "s" : ""} (${ls.map(it => esc(artOf(it.artId).desc)).join(", ")}) aunque ${esc(otro.nom.split(" ")[0])} cotizó más barato: da ${p.plazo} días contra ${otro.plazo} y cumplió el ${d.otif} % de sus entregas contra ${d2.otif} %.`;
    }).join("<br>") + `<br><br>Diferencia de precio total: <b>${c(Math.round(extra))}</b>, que se compensa con el plazo y el cumplimiento.`;
  }


  /* ── pantalla: bandeja de cotizaciones a la izquierda; la cotización
     a la derecha, armada en el mismo lugar: artículos → proveedores →
     envío y respuestas → adjudicación ── */
  let subFiltro = "Abiertas", focoS = null, traerA = null;
  const SUB_F = [
    { v: "Abiertas", f: s => s.paso < 3 },
    { v: "Adjudicadas", f: s => s.paso === 3 },
    { v: "Todas", f: () => true }
  ];
  const SUB_EST = [["Borrador", "mu"], ["Esperando respuestas", "wa"], ["Por adjudicar", "acc"], ["Adjudicada", "ok"]];
  const subTag = s => tag(SUB_EST[s.paso][0], SUB_EST[s.paso][1]);
  /* proveedores que conviene invitar: los que hoy surten esos artículos, después los de mejor cumplimiento */
  function sugeridosSub(s) {
    const cuenta = {};
    s.items.forEach(it => { const pid = (artOf(it.artId) || {}).provId; if (pid) cuenta[pid] = (cuenta[pid] || 0) + 1; });
    const fuera = provActivos().filter(p => s.provs.indexOf(p.id) < 0);
    return fuera.map(p => ({ p, n: cuenta[p.id] || 0, d: desempeno(p.id).otif }))
      .sort((a, b) => b.n - a.n || b.d - a.d).slice(0, 5);
  }

  A.screen("subasta", {
    title: "Cotizar a proveedores",
    sub: () => SUBS.filter(s => s.paso < 3).length + " cotizaciones abiertas · se compara precio, plazo y cumplimiento antes de adjudicar",
    extra: () => `<button class="btn pri" id="subNueva">${icon("plus")}Nueva cotización</button>`,
    prep(arg) { if (arg) { subSel = arg; S.arg = null; } },
    render(v) {
      const f = SUB_F.find(x => x.v === subFiltro) || SUB_F[0];
      const rows = SUBS.filter(f.f);
      if (!rows.some(s => s.id === subSel) && rows.length) subSel = rows[0].id;
      const s = rows.find(x => x.id === subSel) || null;
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div style="margin:-4px 0 10px">${field("Mostrar", `<select class="inp" id="subF">${SUB_F.map(x => `<option value="${x.v}" ${x.v === subFiltro ? "selected" : ""}>${x.v} · ${SUBS.filter(x.f).length}</option>`).join("")}</select>`)}</div>
            ${rows.length ? `<div class="mitems">${rows.map(x => `<button class="mitem" style="display:block;text-align:left" data-sub="${x.id}" aria-selected="${x.id === subSel}">
              <span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="itd num" style="white-space:nowrap">${esc(x.id.replace("SUB-2026-", "SUB "))}</span><span class="itc">${esc(locNom(x.destino))}</span></span>
              <span class="itd" style="display:block;font-weight:600">${esc(x.t)}</span>
              <span class="itc" style="display:block">${x.items.length} artículos · ${x.provs.length} proveedores</span>
              <span style="display:block;margin-top:5px">${subTag(x)}</span></button>`).join("")}</div>`
          : empty("gavel", "No hay cotizaciones " + subFiltro.toLowerCase(), "Cree una con «Nueva cotización».")}`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">${s ? detalleSub(s) : card({ body: empty("gavel", "Ninguna cotización", "Cree una con «Nueva cotización»: se arma aquí mismo, artículo por artículo, pegando desde Excel o trayendo el sugerido de compra.") })}</div>
      </div>`;
    },
    wire(v) {
      A.wireIr(v); wirePasos(v);
      const nb = $("#subNueva", document); if (nb) nb.addEventListener("click", () => {
        if (!exige("comprar", "Crear cotizaciones")) return;
        const s = nuevaSub([], "CD", "Cotización nueva", []);
        anotar("Creó cotización", s.id);
        subFiltro = "Abiertas"; focoS = "#sA"; A.refresh();
      });
      const fs = $("#subF", v); if (fs) fs.addEventListener("change", () => { subFiltro = fs.value; A.refresh(); });
      $$("[data-sub]", v).forEach(b => b.addEventListener("click", () => { subSel = b.dataset.sub; A.refresh(); }));
      const s = SUBS.find(x => x.id === subSel);
      if (s) wireSub(v, s);
      if (focoS) { const el = $(focoS, v); focoS = null; if (el) { el.focus(); if (el.select) el.select(); } }
    }
  });

  function detalleSub(s) {
    const edit = s.paso === 0;
    const arts = s.items.map(it => ({ it, a: artOf(it.artId) }));
    const listo = s.items.length && s.provs.length >= 2;
    /* recorrido de la cotización */
    const now = s.paso === 0 ? (!s.items.length ? 0 : s.provs.length < 2 ? 1 : 2) : s.paso === 1 ? 2 : s.paso === 2 ? 3 : 4;
    const P = [
      ["Artículos", s.items.length ? s.items.length + " por cotizar" : "Agregue artículos"],
      ["Proveedores", s.provs.length ? s.provs.length + " invitados" : "Invite al menos dos"],
      ["Envío y respuestas", s.paso === 0 ? "Por enviar" : s.paso === 1 ? "Esperando respuestas" : "Respuestas cargadas"],
      ["Adjudicación", s.paso === 3 ? s.ocs.length + " órdenes creadas" : "Por precio, plazo y cumplimiento"]
    ];
    const pasosS = `<ol class="steps" style="grid-template-columns:repeat(4,minmax(0,1fr))" aria-label="Recorrido de la cotización">${P.map((x, k) => {
      const est = k < now ? "done" : k === now ? "now" : "";
      return `<li><div class="step ${est}" ${k === now ? 'aria-current="step"' : ""}><span class="sn">${est === "done" ? icon("check") : k + 1}</span><span class="st"><b>${x[0]}</b><small>${esc(x[1])}</small></span></div></li>`;
    }).join("")}</ol>`;
    const bar = (t, sub, btn, acc) => `<div class="stepbar"><div class="sbt"><b>${t}</b><span>${sub}</span></div><div class="sba">${acc ? quienHace(acc) : ""}${btn || ""}</div></div>`;
    const sigue = s.paso === 0
      ? (!s.items.length ? bar("Sigue: agregar los artículos", "Búsquelos por nombre, código o código de barras, péguelos desde Excel o tráigalos del sugerido de compra.", "", "comprar")
        : s.provs.length < 2 ? bar("Sigue: invitar proveedores", "Una cotización compara: invite al menos dos. Puede buscar a cualquier proveedor del catálogo, no solo los sugeridos.", "", "comprar")
          : bar("Lista para enviar", s.items.length + " artículos a " + s.provs.length + " proveedores, por correo y WhatsApp, con cantidad y destino.", `<button class="btn pri" id="sub1">${icon("file")}Enviar a ${s.provs.length} proveedores</button>`, "comprar"))
      : s.paso === 1 ? bar("Sigue: cargar las respuestas", "Cada proveedor devuelve la misma lista con su precio. Se carga el archivo y el cuadro se arma solo; nadie digita precios.", `<button class="btn pri" id="sub2">${icon("arrowdown")}Cargar respuestas</button>`, "comprar")
        : s.paso === 2 ? bar("Sigue: adjudicar", "Toque un precio para adjudicar esa línea, o use la sugerencia y ajuste lo que haga falta.", `<button class="btn" id="adjSug">${icon("sparkle")}Sugerencia</button><button class="btn" id="adjPrecio">Solo por precio</button><button class="btn pri" id="adjOk">${icon("check")}Adjudicar y crear órdenes</button>`, "comprar")
          : bar("Adjudicada", "Las órdenes quedaron registradas, una por proveedor, y van a aprobación.", s.ocs.map(cn => { const o = ocDe(cn); return `<button class="btn sm" data-paso="ordenes|${esc(cn)}">${esc(nomOC(o ? o.cons : cn))}</button>`; }).join(""));

    const datos = card({
      title: s.id, actions: subTag(s) + (edit ? ` <button class="btn sm" id="sDesc">${icon("x")}Descartar</button>` : ""),
      body: edit ? `<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:10px">
            ${field("Nombre de la cotización", `<input class="inp" id="sT" value="${esc(s.t)}" placeholder="Ej.: Fontanería de temporada">`)}
            ${field("Destino", `<select class="inp" id="sL">${D.locales.map(l => `<option value="${l.id}" ${l.id === s.destino ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>`)}
            ${field("Reciben respuestas hasta", `<input class="inp" id="sC" value="${esc(s.cierra)}">`)}</div>`
        : `<div class="ficha" style="margin:-12px -17px -16px">
            ${fichaCell("Cotización", `<span style="font-family:var(--ui);font-size:14px">${esc(s.t)}</span>`)}
            ${fichaCell("Destino", `<span style="font-family:var(--ui);font-size:14px">${esc(locNom(s.destino))}</span>`)}
            ${fichaCell("Cierra", `<span style="font-family:var(--ui);font-size:14px">${esc(s.cierra)}</span>`)}
            ${fichaCell("Responsable", `<span style="font-family:var(--ui);font-size:14px">${esc(s.resp.split(" ").slice(0, 2).join(" "))}</span>`)}</div>`
    });

    const tArts = card({
      title: "Artículos a cotizar · " + s.items.length,
      actions: edit ? `<button class="btn sm" id="sPeg">${icon("upload")}Pegar desde Excel</button><button class="btn sm" id="sSug" title="Abre el sugerido de compra de Inventarios; lo que escoja allá vuelve a esta cotización">${icon("sparkle")}Traer del sugerido</button>` : "",
      body: (edit ? buscadorHTML("sA", "Agregar artículo: nombre, código o código de barras", { ic: "scan", style: "margin:0 0 12px" }) : "") +
        (arts.length ? table({
          h: edit ? "360px" : "260px",
          cols: [
            { t: "Artículo", fmt: x => `${esc(x.a.desc)}<span class="sub mono">${esc(x.a.cod)}</span>` },
            { t: "Cantidad", r: true, cls: "mono", w: "140px", fmt: (x, i) => edit ? `<input class="inp num" data-sq="${i}" value="${x.it.cant}" inputmode="decimal" aria-label="Cantidad de ${esc(x.a.desc)}" style="width:80px;text-align:right;padding:4px 7px"> <span class="dim">${esc(unid(x.a))}</span>` : cantTxt(x.it.cant, x.a) },
            { t: "Último costo", r: true, cls: "mono", fmt: x => grp(x.a.ultCosto != null ? x.a.ultCosto : x.a.costo) },
            { t: "Existencia", r: true, cls: "mono", fmt: x => grp(D.stockTotal(x.a.id)) }
          ].concat(edit ? [{ t: "", w: "36px", fmt: (x, i) => `<button class="iconbtn" data-sqx="${i}" aria-label="Quitar ${esc(x.a.desc)}" style="width:26px;height:26px">${icon("x")}</button>` }] : []),
          rows: arts
        }) : `<div class="mut" style="font-size:13px">Todavía no hay artículos.</div>`)
    });

    const sug = edit ? sugeridosSub(s) : [];
    const tProv = card({
      title: "Proveedores invitados · " + s.provs.length,
      body: (edit ? buscadorHTML("sP", "Invitar proveedor: nombre, cédula o línea", { style: "margin:0 0 10px" }) : "") +
        (sug.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px"><span class="mut" style="font-size:12.5px">Sugeridos:</span>${sug.map(x => `<button class="btn sm" data-inv="${x.p.id}" title="${esc(x.p.nom)} · ${x.p.plazo} días · ${x.d} % a tiempo">${icon("plus")}${esc(provCorto(x.p.id))}${x.n ? ` <span class="dim">· surte ${x.n}</span>` : ""}</button>`).join("")}</div>` : "") +
        (s.provs.length ? table({
          cols: [
            { t: "Proveedor", fmt: pid => { const p = D.provById[pid]; return `${esc(p.nom)}<span class="sub mono">${esc(p.ced)} · ${esc(p.linea)}</span>`; } },
            { t: "Plazo", r: true, cls: "mono", fmt: pid => D.provById[pid].plazo + " d" },
            { t: "A tiempo", r: true, cls: "mono", fmt: pid => desempeno(pid).otif + " %" },
            { t: "Se envía por", fmt: pid => { const p = D.provById[pid]; return `<span class="mut" style="font-size:12.5px">${esc(p.correo || "correo de pedidos")} · WhatsApp</span>`; } }
          ].concat(edit ? [{ t: "", w: "36px", fmt: pid => `<button class="iconbtn" data-spx="${pid}" aria-label="Quitar ${esc(D.provById[pid].nom)}" style="width:26px;height:26px">${icon("x")}</button>` }] : []),
          rows: s.provs
        }) : `<div class="mut" style="font-size:13px">Nadie invitado todavía.</div>`)
    });

    let cuadro = "";
    if (s.paso >= 2) {
      const best = x => Math.min.apply(null, s.provs.map(pid => s.ofertas[pid][x.a.id] == null ? Infinity : s.ofertas[pid][x.a.id]));
      const totAdj = arts.reduce((t, x) => t + (s.adj[x.a.id] ? s.ofertas[s.adj[x.a.id]][x.a.id] * x.it.cant : 0), 0);
      cuadro = card({
        title: "Cuadro comparativo", hint: s.paso === 3 ? "adjudicada" : "toque un precio para adjudicar esa línea · ✓ = el más bajo",
        body: table({
          cols: [{ t: "Artículo", fmt: x => `${esc(x.a.desc)}<span class="sub">${esc(x.a.cod)} · ${grp(x.it.cant)} ${esc(unid(x.a))}</span>` },
          { t: "Último costo", r: true, cls: "mono", fmt: x => `<span class="mut">${grp(x.a.ultCosto != null ? x.a.ultCosto : x.a.costo)}</span><span class="sub">exist. ${grp(D.stockTotal(x.a.id))}</span>` }]
            .concat(s.provs.map(pid => {
              const p = D.provById[pid], d = desempeno(pid);
              return {
                t: p.nom.split(" ")[0] + " · " + p.plazo + "d · " + d.otif + "%", r: true, cls: "mono", fmt: x => {
                  const val = s.ofertas[pid][x.a.id];
                  if (val == null) return '<span class="dim" title="No cotizó">—</span>';
                  const b = val === best(x), on = s.adj[x.a.id] === pid;
                  const vr = (val / x.a.costo - 1) * 100;
                  return `<button class="btn sm" data-adj="${x.a.id}|${pid}" ${s.paso === 3 ? "disabled" : ""} aria-pressed="${on}" style="font-family:var(--num);min-width:88px;justify-content:flex-end;${on ? "border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft);" : ""}${b ? "color:var(--ok);font-weight:700" : ""}">${grp(val)}${b ? " ✓" : ""}</button><span class="sub" style="color:${Math.abs(vr) > POL.topeVar ? "var(--crit)" : "var(--ink-4)"}">${vr > 0 ? "+" : ""}${dec(vr, 1)} %</span>`;
                }
              };
            }))
            .concat([{ t: "Adjudicado a", fmt: x => s.adj[x.a.id] ? esc(D.provById[s.adj[x.a.id]].nom.split(" ")[0]) : '<span class="dim">—</span>' }]),
          rows: arts,
          foot: [{ v: "Total adjudicado", span: 2 + s.provs.length }, { v: totAdj ? c(Math.round(totAdj)) : "—", cls: "mono" }]
        })
      }) + (s.modo ? card({
        title: "Por qué esta adjudicación", actions: tag(s.modo === "precio" ? "Solo por precio" : s.modo === "manual" ? "Manual" : "Sugerida por IA", "acc", "sparkle"),
        body: `<div style="display:flex;gap:11px;padding:13px 15px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line)">${icon("sparkle")}
            <div style="font-size:13.5px;color:var(--ink);line-height:1.6">${s.modo === "precio" ? "Cada línea al precio más bajo, sin pesar plazo ni cumplimiento." : explicacion(s)}</div></div>
          <div class="mut" style="font-size:12.5px;line-height:1.5;margin-top:10px">La sugerencia se explica siempre. La decisión y su motivo quedan en la bitácora con el nombre de quien adjudicó.</div>`
      }) : "");
    }
    return pasosS + sigue + datos + (s.paso >= 2 ? cuadro + `<div class="grid g2" style="align-items:start">${tArts}${tProv}</div>` : s.paso === 1 ? `<div class="grid g2" style="align-items:start">${tArts}${tProv}</div>` : tArts + tProv);
  }

  function wireSub(v, s) {
    const edit = s.paso === 0;
    if (edit) {
      const t = $("#sT", v), l = $("#sL", v), ci = $("#sC", v);
      if (t) t.addEventListener("change", () => { s.t = t.value.trim() || s.t; A.refresh(); });
      if (l) l.addEventListener("change", () => { s.destino = l.value; A.refresh(); });
      if (ci) ci.addEventListener("change", () => { s.cierra = ci.value.trim() || s.cierra; });
      const ds = $("#sDesc", v); if (ds) ds.addEventListener("click", () => {
        if (!exige("comprar", "Descartar cotizaciones")) return;
        SUBS.splice(SUBS.indexOf(s), 1);
        anotar("Descartó cotización", s.id + " · sin enviar");
        subSel = null; toast("Cotización descartada", s.id + " no se había enviado.", "ok"); A.refresh();
      });
      const addArt = (a, n) => {
        if (!exige("comprar", "Editar la cotización")) return;
        const it = s.items.find(x => x.artId === a.id);
        if (it) { if (n) it.cant += n; pita("wa"); toast("Ya estaba en la lista", a.desc + (n ? ": se sumaron " + grp(n) : ""), "wa"); focoS = "#sA"; }
        else { s.items.push({ artId: a.id, cant: n || presC(a).f || 1 }); pita("ok"); focoS = `[data-sq="${s.items.length - 1}"]`; }
        A.refresh();
      };
      wireBuscador(v, "sA", {
        buscar: q => buscaArts(q.replace(/^\s*\d+(?:[.,]\d+)?\s*\*\s*/, "")).map(artItem),
        vacio: q => "Ningún artículo coincide con «" + q + "». Pruebe con parte del nombre, la marca o el código.",
        enter: txt => { const x = porCodigo(txt); if (!x) return false; if (!x.a) { pita("cr"); toast("No se encontró", "«" + x.err + "» no está en el catálogo.", "cr"); return true; } addArt(x.a, x.n); return true; },
        elegir: (r, txt) => { const m = /^\s*(\d+(?:[.,]\d+)?)\s*\*/.exec(txt); addArt(r.a, m ? num(m[1]) : null); }
      });
      $$("[data-sq]", v).forEach(inp => {
        const set = sigue => {
          const i = +inp.dataset.sq, n = num(inp.value);
          if (!(n > 0)) { inp.value = s.items[i].cant; return toast("Cantidad no válida", "Escriba un número mayor que cero.", "cr"); }
          s.items[i].cant = n;
          if (sigue) { focoS = i + 1 < s.items.length ? `[data-sq="${i + 1}"]` : "#sA"; A.refresh(); }
        };
        inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); inp._ok = true; set(true); } });
        inp.addEventListener("change", () => { if (!inp._ok) set(false); });
      });
      $$("[data-sqx]", v).forEach(b => b.addEventListener("click", () => { s.items.splice(+b.dataset.sqx, 1); A.refresh(); }));
      const sg0 = $("#sSug", v); if (sg0) sg0.addEventListener("click", () => { traerA = s.id; A.go("reposicion", "sugerido"); });
      const peg = $("#sPeg", v); if (peg) peg.addEventListener("click", () => {
        if (!exige("comprar", "Editar la cotización")) return;
        pegarSheet({
          titulo: "Pegar artículos desde Excel", sub: "Código y cantidad por fila: la lista que hoy se arma en la hoja de subasta",
          muestra: D.articulos.filter(a => a.tipo !== "Servicio" && a.ean).slice(20, 25),
          yaEsta: id => s.items.some(x => x.artId === id),
          cargar: ok => { ok.forEach(f => { const it = s.items.find(x => x.artId === f.a.id); if (it) it.cant += f.n; else s.items.push({ artId: f.a.id, cant: f.n }); }); A.refresh(); }
        });
      });
      const invitar = pid => {
        if (!exige("comprar", "Invitar proveedores")) return;
        if (s.provs.indexOf(pid) >= 0) return toast("Ya está invitado", provNom(pid), "wa");
        s.provs.push(pid); focoS = "#sP"; A.refresh();
      };
      wireBuscador(v, "sP", {
        buscar: q => buscaProvs(q).filter(p => s.provs.indexOf(p.id) < 0).map(provItem),
        vacio: q => "Ningún proveedor coincide con «" + q + "». Si es nuevo, créelo en Compras › Proveedores.",
        elegir: r => invitar(r.id)
      });
      $$("[data-inv]", v).forEach(b => b.addEventListener("click", () => invitar(b.dataset.inv)));
      $$("[data-spx]", v).forEach(b => b.addEventListener("click", () => { s.provs.splice(s.provs.indexOf(b.dataset.spx), 1); A.refresh(); }));
    }
    const s1 = $("#sub1", v), s2 = $("#sub2", v);
    if (s1) s1.addEventListener("click", () => {
      if (!exige("comprar", "Enviar solicitudes de cotización")) return;
      s.paso = 1;
      anotar("Envió solicitud de cotización", s.id + " · " + s.items.length + " artículos · " + s.provs.map(provNom).join(", "));
      toast("Lista enviada", "Salió a " + s.provs.length + " proveedores por correo y WhatsApp, con cantidad y destino.", "ok");
      A.refresh();
    });
    if (s2) s2.addEventListener("click", () => {
      if (!exige("comprar", "Cargar respuestas")) return;
      cargarOfertas(s); s.paso = 2; s.adj = {}; s.modo = null;
      const vacios = s.provs.reduce((t, pid) => t + s.items.filter(it => s.ofertas[pid][it.artId] == null).length, 0);
      toast(s.provs.length + " archivos cargados", "El cuadro se armó solo · " + (s.provs.length * s.items.length - vacios) + " precios · " + vacios + " renglones sin cotizar · 0 errores.", "ok");
      A.refresh();
    });
    const sg = $("#adjSug", v); if (sg) sg.addEventListener("click", () => { adjudicar(s, "ia"); A.refresh(); });
    const pr = $("#adjPrecio", v); if (pr) pr.addEventListener("click", () => { adjudicar(s, "precio"); A.refresh(); });
    $$("[data-adj]", v).forEach(b => b.addEventListener("click", () => {
      const [art, pid] = b.dataset.adj.split("|");
      s.adj[art] = pid; s.modo = "manual";
      A.refresh();
    }));
    const ok = $("#adjOk", v); if (ok) ok.addEventListener("click", () => {
      if (!exige("comprar", "Adjudicar")) return;
      const por = {};
      s.items.forEach(it => { const pid = s.adj[it.artId]; if (pid) (por[pid] = por[pid] || []).push(it); });
      if (!Object.keys(por).length) return toast("Nada adjudicado", "Toque un precio en cada línea o use la sugerencia.", "cr");
      s.ocs = Object.keys(por).map(pid => {
        const oc = nuevaOC(pid, s.destino, por[pid].map(it => ({ a: it.artId, c: it.cant, k: s.ofertas[pid][it.artId], v: 0 })), "Registrada");
        oc.lineas.forEach(l => { l.var = varDe(l); });
        oc.origen = s.id;
        oc.hist[0].acc = "Registró la orden desde la cotización " + s.id;
        return oc.cons;
      });
      s.paso = 3;
      anotar("Adjudicó cotización", s.id + " · " + (s.modo === "precio" ? "solo por precio" : s.modo === "manual" ? "manual" : "según la sugerencia") + " · " + s.ocs.join(", "));
      toast("Adjudicada", s.ocs.length + " órdenes registradas, una por proveedor: " + s.ocs.join(", ") + ". Van a aprobación.", "ok");
      A.refresh();
    });
  }

  /* ── pegar filas desde Excel (orden de compra y cotización) ── */
  function pegarSheet(o) {
    const txt = o.muestra.map((a, i) => a.cod + ";" + (i + 1) * 24).join("\n") + "\nFER-99999;10";
    let filas = [];
    const revisar = t => t.split(/\n/).map(x => x.trim()).filter(Boolean).map((x, i) => {
      const [cod, q] = x.split(/[;\t,]/).map(y => (y || "").trim());
      const a = D.articulos.find(y => y.cod.toLowerCase() === (cod || "").toLowerCase() || y.ean === cod);
      const n = num(q);
      return { i: i + 1, cod, a, n, err: !a ? "Código no existe" : !(n > 0) ? "Cantidad no válida" : null };
    });
    openSheet({
      title: o.titulo, sub: o.sub, wide: true,
      body: `${field("Filas (código y cantidad; se puede pegar directo desde Excel)", `<textarea class="inp" id="plT" rows="8" style="font-family:var(--num)">${esc(txt)}</textarea>`)}
        <div style="margin-top:10px"><button class="btn" id="plRev">${icon("check")}Revisar antes de cargar</button></div>
        <div id="plPrev" style="margin-top:12px"></div>`,
      footer: `<div style="flex:1"></div><button class="btn" id="plX">Cancelar</button><button class="btn pri" id="plOk" disabled>Cargar</button>`,
      after: r => {
        $("#plX", r).addEventListener("click", closeSheet);
        $("#plRev", r).addEventListener("click", () => {
          filas = revisar($("#plT", r).value);
          const ok = filas.filter(f => !f.err);
          $("#plPrev", r).innerHTML = table({
            cols: [
              { t: "Fila", cls: "mono dim", fmt: f => f.i },
              { t: "Código", cls: "mono", fmt: f => esc(f.cod || "") },
              { t: "Artículo", fmt: f => f.a ? esc(f.a.desc) : '<span class="dim">—</span>' },
              { t: "Cantidad", r: true, cls: "mono", fmt: f => (f.n ? grp(f.n) : "—") },
              { t: "", fmt: f => f.err ? tag(f.err, "cr", "alert") : o.yaEsta(f.a.id) ? tag("Se suma a la línea", "wa") : tag("Nueva línea", "ok", "check") }
            ], rows: filas, rowCls: f => (f.err ? "cr" : "")
          });
          const b = $("#plOk", r); b.disabled = !ok.length; b.textContent = "Cargar " + ok.length + " filas" + (filas.length - ok.length ? " (" + (filas.length - ok.length) + " con error quedan fuera)" : "");
        });
        $("#plOk", r).addEventListener("click", () => {
          const ok = filas.filter(f => !f.err);
          closeSheet();
          o.cargar(ok);
          toast(ok.length + " líneas cargadas", "Revise las cantidades antes de seguir.", "ok");
        });
      }
    });
  }

  /* ══ PROVEEDORES ═════════════════════════════════════════════
     Buscar entre cientos, crear, editar e inactivar (nunca borrar,
     SEG-007). Desde la orden se abre el mismo cajón (COM-018). */
  let provSel = "P1", provQ = "";
  const LINEAS = () => [...new Set(D.proveedores.map(p => p.linea))].sort();
  function provSheet(pid, desdeOrden) {
    const p = pid ? D.provById[pid] : null, nuevo = !p;
    if (p) {
      p.contacto = p.contacto || "Ejecutivo de ventas";
      p.correo = p.correo || "pedidos@" + p.nom.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "") + ".cr";
      p.wa = p.wa || "8" + String(3000000 + (p.ced.replace(/\D/g, "") % 6999999)).slice(0, 7);
    }
    const x = p || { ced: "", nom: "", linea: "", plazo: 30, cuenta: "", contacto: "", correo: "", wa: "" };
    const dsp = p ? desempeno(p.id) : null;
    openSheet({
      title: nuevo ? "Nuevo proveedor" : p.nom, sub: nuevo ? "Queda activo para órdenes y cotizaciones" : p.ced + " · " + p.linea + (desdeOrden ? " · sin salir de la orden" : ""),
      body: `${p && desdeOrden ? `<dl class="kv" style="margin-bottom:14px">
            <dt>Negociaciones</dt><dd>${(p.negociaciones || []).map(n => esc(n.t) + " " + n.plazo + " d" + (n.desc ? " · " + dec(n.desc, n.desc % 1 ? 1 : 0) + " %" : "")).join(" · ")}</dd>
            <dt>A tiempo y completas</dt><dd class="num">${dsp.otif} % <span class="mut">(${dsp.ents} entregas en 90 días)</span></dd>
            <dt>Entrega real</dt><dd class="num">${dsp.leadReal} días <span class="mut">(promete ${dsp.lead})</span></dd></dl>` : ""}
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
          ${field("Cédula jurídica o física", `<input class="inp num" id="pfCed" value="${esc(x.ced)}" placeholder="3-101-000000" ${nuevo ? "" : "readonly"}>`)}
          ${field("Plazo pactado (días)", `<input class="inp num" id="pfPl" value="${x.plazo}" inputmode="numeric">`)}
          <div style="grid-column:1/-1">${field("Razón social", `<input class="inp" id="pfNom" value="${esc(x.nom)}" placeholder="Nombre como aparece en la factura electrónica">`)}</div>
          ${field("Línea principal", `<input class="inp" id="pfLin" list="pfLinL" value="${esc(x.linea)}" placeholder="Fontanería, Cemento…"><datalist id="pfLinL">${LINEAS().map(l => `<option value="${esc(l)}">`).join("")}</datalist>`)}
          ${field("Cuenta IBAN", `<input class="inp num" id="pfIban" value="${esc(x.cuenta)}" placeholder="CR00 0000 0000 0000 0000 00" ${nuevo ? "" : "readonly"}>`)}
          ${field("Contacto", `<input class="inp" id="pfC" value="${esc(x.contacto)}" placeholder="Ejecutivo de ventas">`)}
          ${field("Correo para órdenes", `<input class="inp" id="pfE" value="${esc(x.correo)}" placeholder="pedidos@proveedor.cr">`)}
          ${field("WhatsApp", `<input class="inp num" id="pfW" value="${esc(x.wa)}" placeholder="8888 8888">`)}
          ${nuevo ? "" : field("Estado", `<select class="inp" id="pfEst"><option value="">Activo</option><option value="1" ${p.inactivo ? "selected" : ""}>Inactivo · no aparece en órdenes ni cotizaciones</option></select>`)}
        </div>
        <div class="mut" style="font-size:12.5px;margin-top:10px">${nuevo ? "La cédula y la cuenta se validan contra Hacienda y el banco antes del primer pago." : "La cédula no cambia. La cuenta bancaria se cambia en Cobros y pagos, con respaldo y doble verificación. Un proveedor no se borra: se inactiva y conserva su historial."}</div>`,
      footer: `${p && desdeOrden ? `<button class="btn" id="pfFull">Ficha completa</button>` : ""}<div style="flex:1"></div><button class="btn" id="pfX">Cancelar</button><button class="btn pri" id="pfOk">${icon("check")}${nuevo ? "Crear proveedor" : "Guardar"}</button>`,
      after: r => {
        $("#pfX", r).addEventListener("click", closeSheet);
        const full = $("#pfFull", r); if (full) full.addEventListener("click", () => A.go("proveedores", pid));
        $("#pfOk", r).addEventListener("click", () => {
          if (!exige("comprar", nuevo ? "Crear proveedores" : "Modificar proveedores")) return;
          const val = id => $(id, r).value.trim();
          const ced = val("#pfCed"), nom = val("#pfNom"), lin = val("#pfLin"), pl = parseInt(val("#pfPl"), 10), iban = val("#pfIban").replace(/\s/g, "").toUpperCase();
          if (!nom) return toast("Falta la razón social", "Es el nombre que viene en la factura electrónica.", "cr");
          if (!/^(\d-\d{3,4}-\d{4,6}|\d{9,12})$/.test(ced)) return toast("Cédula no válida", "Use el formato 3-101-000000 (jurídica) o 9 a 12 dígitos.", "cr");
          if (nuevo && D.proveedores.some(y => y.ced.replace(/\D/g, "") === ced.replace(/\D/g, ""))) return toast("Ya existe", "Hay un proveedor con esa cédula.", "cr");
          if (!(pl >= 0 && pl <= 180)) return toast("Plazo no válido", "Entre 0 (contado) y 180 días.", "cr");
          if (nuevo && iban && w.COB && w.COB.validaIban && !w.COB.validaIban(iban).ok) return toast("Cuenta IBAN no válida", w.COB.validaIban(iban).msg, "cr");
          const datos = { nom, linea: lin || "General", plazo: pl, contacto: val("#pfC"), correo: val("#pfE"), wa: val("#pfW") };
          if (nuevo) {
            const n = D.proveedores.reduce((m, y) => Math.max(m, parseInt(y.id.slice(1), 10) || 0), 0) + 1;
            const np = Object.assign({ id: "P" + n, ced, cuenta: iban, saldo: 0 }, datos);
            np.negociaciones = [{ id: "N", t: "Normal", plazo: pl, desc: 0 }];
            D.proveedores.push(np); D.provById[np.id] = np;
            anotar("Creó proveedor", np.nom + " · " + np.ced + " · " + np.linea);
            provSel = np.id; provQ = "";
            closeSheet(); toast("Proveedor creado", np.nom + " ya se puede usar en órdenes y cotizaciones.", "ok");
          } else {
            const antes = [p.nom, p.linea, p.plazo + " d", p.contacto, p.correo, p.wa, p.inactivo ? "inactivo" : "activo"].join(" · ");
            Object.assign(p, datos);
            const neg = (p.negociaciones || []).find(y => y.id === "N"); if (neg) neg.plazo = pl;
            const est = $("#pfEst", r); p.inactivo = !!(est && est.value);
            anotar(p.inactivo ? "Inactivó proveedor" : "Modificó proveedor", p.nom, null, antes, [p.nom, p.linea, p.plazo + " d", p.contacto, p.correo, p.wa, p.inactivo ? "inactivo" : "activo"].join(" · "), p.inactivo ? "Alta" : "Media");
            closeSheet(); toast("Proveedor actualizado", desdeOrden ? "Sigue en la orden donde estaba." : p.nom, "ok");
          }
          A.refresh();
        });
      }
    });
  }

  function listaProv(sel) {
    const t = N(provQ).split(/\s+/).filter(Boolean);
    const L = D.proveedores.filter(x => t.every(y => N(x.nom + " " + x.ced + " " + x.linea).includes(y))).sort((a, b) => (a.inactivo - b.inactivo) || b.saldo - a.saldo);
    return `<div class="mut" style="font-size:12px;margin:8px 0 6px">${L.length} de ${D.proveedores.length} · ordenados por saldo</div>` +
      (L.length ? `<div class="mitems">${L.map(x => `
      <button class="mitem" data-p="${x.id}" aria-selected="${x.id === sel}">
        <span style="flex:1;min-width:0"><span class="itd">${resalta(x.nom, provQ)}</span><span class="itc">${resalta(x.ced + " · " + x.linea, provQ)}</span></span>
        ${x.inactivo ? tag("Inactivo", "mu") : tag(c(Math.round(x.saldo)), x.saldo > 8000000 ? "wa" : "mu")}</button>`).join("")}</div>`
        : empty("users", "Sin coincidencias", "Pruebe con parte del nombre, la cédula o la línea, o cree el proveedor."));
  }

  A.screen("proveedores", {
    title: "Proveedores",
    sub: () => provActivos().length + " proveedores activos",
    extra: () => `<button class="btn pri" id="pvNuevo">${icon("plus")}Nuevo proveedor</button>`,
    prep(arg) { if (arg) { provSel = arg; S.arg = null; } },
    render(v) {
      const p = D.provById[provSel] || D.proveedores[0];
      /* el mismo auxiliar de Cobros y pagos: facturas migradas, compras aplicadas y comprobantes aceptados */
      const docs = w.COB ? w.COB.docsCxP().filter(x => x.provId === p.id && Math.round(x.saldo) !== 0) : D.cxp.filter(x => x.provId === p.id);
      const ocs = OCS().filter(o => o.provId === p.id).sort(ordenFecha);
      const rec = D.recibidos.filter(r => r.provId === p.id);
      const d = desempeno(p.id);
      const semaf = (v2, bueno, malo) => v2 >= bueno ? "var(--ok)" : v2 >= malo ? "var(--warn)" : "var(--crit)";
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div class="scan" style="margin:0">${icon("search")}<input id="pvQ" type="text" autocomplete="off" value="${esc(provQ)}" placeholder="Buscar: nombre, cédula o línea" aria-label="Buscar proveedor"></div>
          <div id="pvList">${listaProv(p.id)}</div>`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          ${card({
        actions: `${p.inactivo ? tag("Inactivo", "mu") : ""}<button class="btn sm" id="pvEdit">Editar datos</button>`,
        body: `<h3 style="font-size:19px">${esc(p.nom)}</h3>
          <div class="mut num" style="font-size:12px;margin-top:2px">${esc(p.ced)} · línea: ${esc(p.linea)}${p.correo ? " · " + esc(p.correo) : ""}${p.wa ? " · WhatsApp " + esc(p.wa) : ""}</div>
          <div class="ficha" style="margin:15px -17px -16px;border-top:1px solid var(--hair-2)">
            ${fichaCell("Plazo pactado", p.plazo + " días")}
            ${fichaCell("Saldo pendiente", c(Math.round(p.saldo)))}
            ${fichaCell("Cuenta IBAN", `<span style="font-size:12px">${esc(p.cuenta || "—")}</span>`)}
            ${fichaCell("Órdenes abiertas", ocs.filter(abierta).length)}
            ${fichaCell("Comprobantes sin aceptar", rec.filter(r => r.estado === "Sin aceptar").length, rec.filter(r => r.estado === "Sin aceptar").length ? "var(--warn)" : null)}
          </div>`
      })}
          ${card({
        title: "Desempeño · últimos 90 días", hint: "lo mide el sistema en cada recepción, no la memoria del comprador",
        body: `<div class="grid g4">
            ${stat("A tiempo y completas", d.otif + " %", { txt: d.aTiempo + " a tiempo · " + d.completas + " completas de " + d.ents }, semaf(d.otif, 90, 75))}
            ${stat("Líneas surtidas", d.fill + " %", { txt: "nivel de servicio por línea" }, semaf(d.fill, 95, 88))}
            ${stat("Entrega real", d.leadReal + " días", { txt: "promete " + d.lead + " días" }, d.leadReal > d.lead ? "var(--warn)" : "var(--ok)")}
            ${stat("Variación de precio", "±" + dec(d.varP, 1) + " %", { txt: d.nc + " notas de crédito recibidas" }, d.varP > 5 ? "var(--warn)" : "var(--accent)")}
          </div>`
      })}
          <div class="grid g2" style="align-items:start">
            ${card({
        title: "Negociaciones vigentes", hint: "la orden escoge cuál usa",
        body: table({
          cols: [
            { t: "Negociación", fmt: n => `<b>${esc(n.t)}</b>` },
            { t: "Plazo", r: true, cls: "mono", fmt: n => n.plazo + " días" },
            { t: "Descuento", r: true, cls: "mono", fmt: n => (n.desc ? dec(n.desc, n.desc % 1 ? 1 : 0) + " %" : "—") }
          ], rows: p.negociaciones || []
        }) + `<div class="mut" style="font-size:12.5px;margin-top:8px">El pronto pago se aplica al programar el pago en Cobros y pagos.</div>`
      })}
            ${card({
        title: "Órdenes de compra",
        body: table({
          h: "320px",
          cols: [
            { t: "Orden", cls: "mono", fmt: r => `<button class="btn sm" data-paso="ordenes|${esc(r.cons)}" style="font-family:var(--num)">${esc(nomOC(r.cons))}</button>` },
            { t: "Destino", fmt: r => esc(locNom(r.locId)) },
            { t: "Total", r: true, cls: "mono", fmt: r => grp(r.total) },
            { t: "Estado", fmt: r => estTag(r) }
          ], rows: ocs
        })
      })}
          </div>
          ${card({
        title: "Estado de cuenta",
        body: table({
          h: "320px",
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.doc) },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Vence", cls: "mono", fmt: r => fecha(r.vence) },
            { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.monto) },
            { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${r.saldo < 0 ? "−" : ""}${grp(Math.abs(r.saldo))}</b>` }
          ], rows: docs, rowCls: r => (r.dias > 0 ? "wa" : "")
        }),
        actions: `<button class="btn sm" data-ir="cob-estado-prov|${p.id}">Estado de cuenta completo</button>`
      })}
        </div></div>`;
    },
    wire(v) {
      A.wireIr(v); wirePasos(v);
      const bindLista = () => $$("[data-p]", v).forEach(b => b.addEventListener("click", () => { provSel = b.dataset.p; A.refresh(); }));
      bindLista();
      const q = $("#pvQ", v);
      if (q) q.addEventListener("input", () => { provQ = q.value; $("#pvList", v).innerHTML = listaProv(provSel); bindLista(); });
      const nb = $("#pvNuevo", document); if (nb) nb.addEventListener("click", () => provSheet(null));
      const ed = $("#pvEdit", v); if (ed) ed.addEventListener("click", () => provSheet(provSel));
    }
  });

  /* ══ LO QUE OTROS MÓDULOS PUEDEN PEDIRLE A COMPRAS ═══════════
     Inventarios › Reposición manda aquí el sugerido para cotizarlo. */
  A.compras = {
    nuevaSubasta(items, locId, titulo) {
      /* si se vino desde una cotización en borrador, el sugerido se suma a esa */
      const s0 = traerA && SUBS.find(x => x.id === traerA && x.paso === 0);
      traerA = null;
      if (s0) {
        items.forEach(it => { const y = s0.items.find(x => x.artId === it.artId); if (y) y.cant += it.cant; else s0.items.push({ artId: it.artId, cant: it.cant }); });
        subSel = s0.id; subFiltro = "Abiertas";
        return s0.id;
      }
      const provs = [...new Set(items.map(it => (artOf(it.artId) || {}).provId).filter(Boolean))];
      provActivos().filter(p => provs.indexOf(p.id) < 0).sort((a, b) => desempeno(b.id).otif - desempeno(a.id).otif).slice(0, Math.max(0, 3 - provs.length)).forEach(p => provs.push(p.id));
      const s = nuevaSub(items, locId, titulo || "Sugerido de " + locNom(locId || "CD"), provs);
      subFiltro = "Abiertas";
      return s.id;
    },
    ordenDe: ocDe,
    /* el buscador de proveedores y artículos, para las pantallas vecinas (Inventarios › Reposición) */
    ui: { buscadorHTML, wireBuscador, buscaProvs, provItem, provCorto, buscaArts, artItem }
  };

  /* ══ CUENTAS POR PAGAR ═══════════════════════════════════════
     Se mudó a mod-cobros.js (módulo Cobros y pagos, 23 set 2026):
     vencimientos, lotes con firma mancomunada y archivo del Banco Nacional. */

})(window);
