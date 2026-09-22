/* ═══════════════════════════════════════════════════════════════
   Ventas — lo que la venta hace sola (window.VENX)
   Descuentos por categoría y volumen con tope por margen, márgenes
   y autorizaciones de un solo uso, cajas y turnos, proformas y
   pedidos, entregas y retiros, devoluciones, ficha del cliente y
   vendedores. Los datos de ejemplo están armados para que cada
   pestaña de Ventas tenga algo real que resolver.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, HOY = D.HOY;
  const pad = (n, k) => String(n).padStart(k, "0");
  const S_TERM = () => (w.S && w.S.term) || 1;
  /* n días antes del «hoy» del demo, a la hora que se indique */
  const dia = (n, h, m) => { const d = new Date(HOY); d.setDate(d.getDate() - n); if (h != null) d.setHours(h, m || 0, 0, 0); return d; };
  const ahora = () => { const d = new Date(HOY), n = new Date(); d.setHours(n.getHours(), n.getMinutes(), n.getSeconds(), 0); return d; };
  const byCod = cod => D.articulos.find(a => a.cod === cod);
  const esHoy = d => d && d.toDateString() === HOY.toDateString();
  const diasEntre = (a, b) => Math.round((b - a) / 86400000);
  const locDe = id => D.locales.find(l => l.id === id);
  function anotar(accion, detalle, usuario, locId, sev, antes, despues) {
    D.bitacora.unshift({
      id: "BT" + Date.now() + Math.random().toString(36).slice(2, 6), fecha: ahora(), usuario: usuario || "Sistema",
      rol: usuario ? "Ventas" : "Automático", locId: locId || "L1", accion, detalle,
      sev: sev || "Media", antes: antes || "", despues: despues || "", ip: "10.2.14.8"
    });
  }

  /* ═══ 1 · PARÁMETROS DE EJEMPLO (se definen con Santa Rosa) ═══ */
  const PARAM = {
    fondoCaja: 50000,            /* fondo de apertura de cada caja */
    topeEfectivo: 300000,        /* sobre esto la caja sugiere un retiro */
    devolucionSinAprobacion: 100000, /* una devolución mayor espera al administrador */
    diasProforma: 15,            /* vigencia de la proforma */
    barrido: "22:00",            /* hora del barrido que cierra autorizaciones abiertas */
    localContable: "marca",      /* VEN-015: "marca" en la factura o "sadic" (local contable) */
    pesoNoDespacho: 400,         /* kg: sobre esto la línea queda «por despachar» sola */
    diasBloqueo: 90              /* días de atraso que bloquean el crédito en la caja */
  };

  /* ═══ 2 · CATEGORÍAS DE CLIENTE Y DESCUENTOS (VEN-007) ═══ */
  const FAMV = D.familias.filter(f => !f.servicio);
  const CATEGORIAS = [
    { id: "Maestro de obra", d: "Contratistas que compran para sus obras" },
    { id: "Constructora", d: "Empresas con proyectos y cuenta a crédito" },
    { id: "Ingeniero", d: "Profesionales que especifican y compran" },
    { id: "Fontanero", d: "Instalación de agua potable y desagüe" },
    { id: "Electricista", d: "Instalaciones eléctricas residenciales" },
    { id: "Ebanista", d: "Muebles y acabados en madera" },
    { id: "Institucional", d: "Municipalidades, ASADAs y cooperativas" },
    { id: "Agropecuario", d: "Fincas y productores" },
    { id: "Consumidor final", d: "Sin descuento: paga el precio de lista" }
  ];
  const BASE = {
    "Maestro de obra": { MAT: 3, TEC: 3, FON: 6, ELE: 6, HER: 8, PIN: 6, FGE: 8, JAR: 5, SEG: 6 },
    "Constructora": { MAT: 4, TEC: 4, FON: 6, ELE: 6, HER: 6, PIN: 8, FGE: 6, JAR: 4, SEG: 8 },
    "Ingeniero": { MAT: 2, TEC: 2, FON: 5, ELE: 5, HER: 5, PIN: 5, FGE: 5, JAR: 3, SEG: 5 },
    "Fontanero": { FON: 12, FGE: 4, HER: 4 },
    "Electricista": { ELE: 12, FGE: 4, HER: 4 },
    "Ebanista": { HER: 10, PIN: 8, FGE: 8 },
    "Institucional": { MAT: 3, TEC: 3, FON: 5, ELE: 5, HER: 5, PIN: 5, FGE: 5, JAR: 5, SEG: 5 },
    "Agropecuario": { JAR: 10, FGE: 5, HER: 5, SEG: 4 },
    "Consumidor final": {}
  };
  const DESC = {};
  CATEGORIAS.forEach(k => { DESC[k.id] = {}; FAMV.forEach(f => { DESC[k.id][f.id] = (BASE[k.id] || {})[f.id] || 0; }); });

  /* margen de lista y margen con descuento, promedio de la familia */
  const prodsFam = fam => D.articulos.filter(a => a.fam === fam && a.tipo === "Producto" && a.precio > 0);
  function margenFam(fam, desc) {
    const ps = prodsFam(fam);
    if (!ps.length) return null;
    const k = 1 - (desc || 0) / 100;
    return ps.reduce((s, a) => s + ((a.precio * k - a.costo) / (a.precio * k)) * 100, 0) / ps.length;
  }
  /* cuánto descuento aguanta un artículo sin bajar del mínimo de su familia */
  function descMax(a) {
    const min = (D.famById[a.fam] || {}).min || 0;
    if (!a.precio || !a.costo) return 0;
    const m = (1 - a.costo / (a.precio * (1 - min / 100))) * 100;
    return Math.max(0, Math.floor(m * 2) / 2);
  }

  /* ═══ 3 · VOLUMEN Y CONVENIOS (VEN-008) ═══ */
  const VOLUMEN = [
    { id: "V1", alcance: "art", ref: "FER-01880", desde: 500, desc: 2, nota: "Bloque por tarima completa" },
    { id: "V2", alcance: "fam", ref: "FON", desde: 50, desc: 6, nota: "Tubería y accesorios por paquete" },
    { id: "V3", alcance: "art", ref: "FER-03840", desde: 1000, desc: 8, nota: "Tornillo de techo por caja" },
    { id: "V4", alcance: "fam", ref: "PIN", desde: 12, desc: 5, nota: "Pintura por caja de 12 cubetas" }
  ];
  const CONVENIOS = [
    { id: "CV1", prov: "Holcim Costa Rica S.A.", alcance: "Cemento UG gris 50 kg", art: "FER-01042", reconoce: 4, como: "Nota de crédito mensual del proveedor", desde: dia(40), hasta: dia(-50), vendido: 1840, porRecuperar: 1840 * 8450 * 0.04 },
    { id: "CV2", prov: "Amanco Costa Rica S.A.", alcance: "Tubería PVC en proyectos de más de ₡1 000 000", art: null, reconoce: 6, como: "Descuento en la siguiente factura", desde: dia(70), hasta: dia(-20), vendido: 620, porRecuperar: 212400 },
    { id: "CV3", prov: "Grupo Sur S.A.", alcance: "Pintura látex para la Municipalidad de Jiménez", art: "FER-05120", reconoce: 10, como: "Nota de crédito al cerrar el proyecto", desde: dia(15), hasta: dia(-75), vendido: 96, porRecuperar: 96 * 21400 * 0.1 }
  ];
  const volumenPara = (a, cant) => VOLUMEN
    .filter(v => (v.alcance === "art" ? v.ref === a.cod : v.ref === a.fam) && cant >= v.desde)
    .sort((x, y) => y.desc - x.desc)[0] || null;

  /* lo que la caja aplica sola al elegir el cliente, al agregar la línea y al cambiar la cantidad */
  const STATS = { descAutoHoy: 37, topeHoy: 9 };
  function descAuto(cliId, artId, cant) {
    const a = D.artById[artId];
    if (!a || a.tipo !== "Producto") return null;
    const cli = cliId ? D.cliById[cliId] : null;
    const pc = cli && DESC[cli.categoria] ? DESC[cli.categoria][a.fam] || 0 : 0;
    const vol = volumenPara(a, cant || 1);
    let d = pc, fuente = cli ? cli.categoria : "";
    if (vol && vol.desc > pc) { d = vol.desc; fuente = "volumen desde " + vol.desde; }
    if (d <= 0) return null;
    const max = descMax(a);
    if (d > max) { d = max; fuente += " · tope por margen"; }
    if (d <= 0) return null;
    return { desc: d, fuente };
  }

  /* ═══ 4 · MÁRGENES, COSTO Y LOCAL CONTABLE (VEN-009, VEN-014, VEN-015) ═══ */
  const VE_COSTO = { "Gerencia": true, "Administrador de local": true, "Cajero": false, "Vendedor de piso": false, "Proveeduría": true, "Bodega": false, "Contabilidad": true, "TI": false };
  const MIN_HIST = [];   /* cambios del mínimo por familia */
  function cambiarMinimo(fam, v, usuario) {
    const f = D.famById[fam]; if (!f) return;
    const antes = f.min; f.min = v;
    MIN_HIST.unshift({ fecha: ahora(), fam, antes, despues: v, usuario: usuario || "Adrián Vindas" });
    anotar("Modificó margen mínimo de familia", "Familia " + f.nom, usuario || "Adrián Vindas", "L1", "Alta", antes + ",0 %", v + ",0 %");
  }
  /* líneas facturadas bajo el mínimo de su familia en los documentos del periodo */
  function bajoMinimo(fam) {
    let n = 0, cedido = 0;
    D.documentos.forEach(d => {
      if (d.tipo !== "FE" && d.tipo !== "TE") return;
      d.lineas.forEach(l => {
        const a = D.artById[l.artId]; if (!a || a.fam !== fam || !a.costo) return;
        const pv = l.precio * (1 - (l.desc || 0) / 100);
        const m = ((pv - a.costo) / pv) * 100, min = D.famById[fam].min;
        if (m < min) { n++; cedido += (a.costo / (1 - min / 100) - pv) * l.cant; }
      });
    });
    return { n, cedido: Math.round(cedido) };
  }

  /* ═══ 5 · AUTORIZACIONES DE UN SOLO USO (VEN-009, VEN-010, SEG-005) ═══ */
  const AUT = [
    { id: "AU1", fecha: dia(0, 10, 52), locId: "L1", term: 2, solicita: "Randall Mata", autoriza: null, art: "FER-05120", cant: 18, margen: 19.2, cli: "C8", motivo: "La Municipalidad pide igualar la cotización de la competencia", factura: null, estado: "Pendiente" },
    { id: "AU2", fecha: dia(0, 9, 14), locId: "L2", term: 1, solicita: "Marta Rojas", autoriza: "Adrián Vindas", art: "FER-03771", cant: 40, margen: 11.8, cli: "C3", motivo: "Cierre de obra; se recupera con el volumen del resto de la factura", factura: "003-00001-01-0000018851", estado: "Consumida" },
    { id: "AU3", fecha: dia(1, 16, 40), locId: "L1", term: 1, solicita: "Kevin Solano", autoriza: "Marta Rojas", art: "FER-00915", cant: 120, margen: 21.5, cli: "C1", motivo: "Proyecto de 40 casas; precio negociado por gerencia", factura: "002-00001-01-0000035188", estado: "Consumida" },
    { id: "AU4", fecha: dia(2, 11, 5), locId: "L3", term: 1, solicita: "Sofía Camacho", autoriza: null, art: "FER-01042", cant: 200, margen: 9.4, cli: "C6", motivo: "El cliente dice que en otro lado está más barato", factura: null, estado: "Rechazada", rechazo: "El precio de la competencia no incluye flete" },
    { id: "AU5", fecha: dia(4, 15, 22), locId: "L2", term: 3, solicita: "Jonathan Ureña", autoriza: "Adrián Vindas", art: "FER-03771", cant: 24, margen: -12.4, cli: "C10", motivo: "Lámina con golpe de transporte, vendida como segunda", factura: "003-00003-01-0000018702", estado: "Consumida" },
    { id: "AU6", fecha: dia(4, 17, 48), locId: "L1", term: 3, solicita: "Yeimy Picado", autoriza: "Marta Rojas", art: "FER-02218", cant: 300, margen: 12.1, cli: "C1", motivo: "Pedido grande con retiro en CEDI", factura: null, estado: "Revertida", reversion: "La factura no se aplicó; el barrido de las 22:00 cerró la autorización" },
    { id: "AU7", fecha: dia(6, 10, 3), locId: "L6", term: 1, solicita: "Grettel Araya", autoriza: "Adrián Vindas", art: "FER-05120", cant: 30, margen: 21.0, cli: "C14", motivo: "Convenio con Grupo Sur: el proveedor reconoce el 10 %", factura: "007-00001-01-0000008790", estado: "Consumida" },
    { id: "AU8", fecha: dia(8, 13, 30), locId: "L4", term: 1, solicita: "Esteban Vindas", autoriza: "Marta Rojas", art: "FER-00915", cant: 60, margen: 22.3, cli: "C7", motivo: "Cliente de ruta con compra recurrente", factura: "005-00001-01-0000005310", estado: "Consumida" }
  ];
  AUT.forEach(x => {
    const a = byCod(x.art); x.a = a;
    const min = a ? D.famById[a.fam].min : 0; x.min = min;
    x.cedido = a ? Math.max(0, Math.round((a.costo / (1 - min / 100) - a.costo / (1 - x.margen / 100)) * x.cant)) : 0;
  });
  const BARRIDO = { ultima: dia(1, 22, 0), terminales: 15, abiertas: 0, revertidasSemana: 1 };
  /* las autorizaciones que la caja registra hoy (bitácora) también se ven aquí;
     al aplicar la factura se consumen y al cancelarla se cierran (VEN-010) */
  const USO = {};
  const CARGA = new Date();   /* lo que la caja autoriza en esta sesión lleva la hora real */
  const vivasCaja = () => D.bitacora.filter(b => b.accion === "Autorizó venta bajo margen" && (esHoy(b.fecha) || b.fecha >= CARGA) && b.detalle.indexOf(" · margen ") > 0 && b.rol === "Gerencia");
  function consumir(factura) { vivasCaja().forEach(b => { if (!USO[b.id]) USO[b.id] = { estado: "Consumida", factura }; }); }
  function revertir() { vivasCaja().forEach(b => { if (!USO[b.id]) USO[b.id] = { estado: "Revertida", reversion: "La factura se canceló en la caja; la autorización se cerró sola" }; }); }
  function autorizaciones() {
    const vivas = vivasCaja()
      .map(b => Object.assign({ id: b.id, fecha: b.fecha, locId: b.locId, term: S_TERM(), solicita: "Kevin Solano", autoriza: b.usuario, art: null, detalle: b.detalle.split(" · margen ")[0], cant: null, margen: parseFloat(String(b.despues).replace(",", ".")), min: parseFloat(String(b.antes).replace(",", ".")), motivo: "Desde la caja", factura: null, estado: "Autorizada", cedido: 0, bt: b.id }, USO[b.id] || {}));
    return vivas.concat(AUT).sort((a, b) => b.fecha - a.fecha);
  }
  function resolver(id, ok, quien, nota) {
    const x = AUT.find(a => a.id === id); if (!x || x.estado !== "Pendiente") return null;
    x.estado = ok ? "Autorizada" : "Rechazada"; x.autoriza = ok ? quien : null; if (!ok) x.rechazo = nota || "Sin motivo";
    anotar(ok ? "Autorizó venta bajo margen" : "Rechazó venta bajo margen", (x.a ? x.a.desc : "") + " · margen " + String(x.margen).replace(".", ",") + " % contra mínimo " + x.min + " %", quien, x.locId, "Alta", x.min + ",0 %", String(x.margen).replace(".", ",") + " %");
    return x;
  }

  /* ═══ 6 · CAJAS, TURNOS Y TERMINALES (VEN-025, VEN-027, VEN-022) ═══ */
  const HABILITADOS = {
    L1: [["Kevin Solano", "Cajero"], ["Yeimy Picado", "Cajera"], ["Randall Mata", "Vendedor y cajero"], ["Marta Rojas", "Administradora"]],
    L2: [["Marta Rojas", "Administradora"], ["Jonathan Ureña", "Administrador"], ["Katherine Vargas", "Administradora"], ["Priscilla Núñez", "Administradora"], ["Álvaro Cordero", "Cajero"], ["Dennis Fallas", "Cajero"]],
    L3: [["Yendry Chacón", "Cajera"], ["Sofía Camacho", "Administradora"]],
    L4: [["Esteban Vindas", "Cajero"], ["Sofía Camacho", "Administradora"]],
    L5: [["Diego Solano", "Cajero y administrador"]],
    L6: [["Grettel Araya", "Cajera"], ["Katherine Vargas", "Administradora"]],
    L7: [["Josué Mora", "Cajero y administrador"]]
  };
  const TERMINALES = [];
  D.tiendas.forEach(l => { for (let t = 1; t <= l.terminales; t++) TERMINALES.push({ id: l.id + "-T" + t, locId: l.id, n: t, cons: l.cod + "-" + pad(t, 5), equipo: "Caja " + t + (t === 1 ? " · mostrador principal" : "") }); });

  const TURNOS = [];
  let tseq = 1;
  const MEDIOS = ["Efectivo", "Tarjeta", "SINPE móvil", "Transferencia", "Cheque", "Dólares", "Anticipo", "Nota de crédito a favor", "Crédito"];
  const EFECTIVO = { "Efectivo": true, "Dólares": true };
  function nuevoTurno(locId, n, cajero, abre, fondo) {
    const t = { id: "TU" + tseq++, locId, n, cajero, abre, fondo: fondo == null ? PARAM.fondoCaja : fondo, retiros: [], cierre: null, estado: "Abierta" };
    TURNOS.push(t); return t;
  }
  /* hoy: casi todas las cajas abrieron a las 7:00; la 2 de Santa Rosa cambió de cajera a media mañana */
  TERMINALES.forEach(tm => {
    const hab = HABILITADOS[tm.locId] || [["Cajero", "Cajero"]];
    if (tm.locId === "L1" && tm.n === 2) {
      const a = nuevoTurno("L1", 2, "Yeimy Picado", dia(0, 7, 0));
      a.retiros.push({ hora: dia(0, 9, 40), monto: 150000, motivo: "Retiro a la bóveda", recibe: "Marta Rojas" });
      a.cierre = { hora: dia(0, 10, 30), contado: null, diferencia: -500, justificacion: "Vuelto mal dado a un cliente; se anotó el nombre", por: "Marta Rojas" };
      a.estado = "Cerrada";
      nuevoTurno("L1", 2, "Randall Mata", dia(0, 10, 30));
      return;
    }
    if (tm.locId === "L1" && tm.n === 3) {   /* quedó abierta desde ayer: el pendiente del administrador */
      nuevoTurno("L1", 3, "Yeimy Picado", dia(1, 13, 0));
      return;
    }
    const cajero = tm.locId === "L1" && tm.n === 1 ? "Kevin Solano" : hab[(tm.n - 1) % hab.length][0];
    const t = nuevoTurno(tm.locId, tm.n, cajero, dia(0, 7, 0));
    if (tm.n === 1 && tm.locId !== "L5") t.retiros.push({ hora: dia(0, 10, 15), monto: 200000, motivo: "Retiro a la bóveda", recibe: (HABILITADOS[tm.locId].find(h => /Admin/.test(h[1])) || hab[0])[0] });
  });
  /* un retiro no puede sacar más efectivo del que entró: se ajusta al que hubo */
  TURNOS.forEach(t => {
    const hasta = t.cierre ? t.cierre.hora : new Date(8640000000000000);
    const efe = D.documentos.filter(d => d.locId === t.locId && d.term === t.n && d.fecha >= t.abre && d.fecha < hasta && d.tipo !== "NC" && d.condicion !== "Crédito" && (d.medio === "Efectivo" || d.medio === "Dólares")).reduce((k, d) => k + d.total, 0);
    let libre = t.fondo + efe - 20000;
    t.retiros = t.retiros.filter(r => { r.monto = Math.min(r.monto, Math.floor(libre / 50000) * 50000); libre -= r.monto; return r.monto > 0; });
  });
  /* cierres de los días anteriores, con sus diferencias */
  const CIERRES = [
    { fecha: dia(1, 18, 5), locId: "L1", n: 1, cajero: "Kevin Solano", ventas: 1842300, diferencia: 0, justificacion: "" },
    { fecha: dia(1, 18, 12), locId: "L1", n: 2, cajero: "Randall Mata", ventas: 1266100, diferencia: 0, justificacion: "" },
    { fecha: dia(1, 18, 40), locId: "L2", n: 3, cajero: "Álvaro Cordero", ventas: 2140500, diferencia: -2000, justificacion: "Billete falso retenido y reportado al OIJ" },
    { fecha: dia(2, 18, 2), locId: "L1", n: 1, cajero: "Kevin Solano", ventas: 1105800, diferencia: 1000, justificacion: "Cliente dejó el vuelto de ₡1 000; se registró como sobrante" },
    { fecha: dia(2, 18, 25), locId: "L3", n: 1, cajero: "Yendry Chacón", ventas: 688400, diferencia: 0, justificacion: "" },
    { fecha: dia(3, 17, 58), locId: "L1", n: 2, cajero: "Yeimy Picado", ventas: 912000, diferencia: -5000, justificacion: null }
  ];
  const turnoDe = (locId, n) => TURNOS.filter(t => t.locId === locId && t.n === n && t.estado === "Abierta").slice(-1)[0] || null;
  const turnosDe = (locId, n) => TURNOS.filter(t => t.locId === locId && t.n === n);
  /* lo que pasó por la caja en el turno: ventas por medio, devoluciones y efectivo esperado */
  function resumen(t) {
    const hasta = t.cierre ? t.cierre.hora : new Date(8640000000000000);
    const docs = D.documentos.filter(d => d.locId === t.locId && d.term === t.n && d.fecha >= t.abre && d.fecha < hasta);
    const por = {}; MEDIOS.forEach(m => { por[m] = { medio: m, n: 0, monto: 0 }; });
    let ventas = 0, devol = 0;
    docs.forEach(d => {
      if (d.tipo === "NC") { if (d.reintegro === "Efectivo") devol += d.total; return; }
      const m = d.condicion === "Crédito" ? "Crédito" : por[d.medio] ? d.medio : "Efectivo";
      por[m].n++; por[m].monto += d.total; ventas += d.total;
    });
    const retiros = t.retiros.reduce((s, r) => s + r.monto, 0);
    const efectivo = t.fondo + por["Efectivo"].monto + por["Dólares"].monto - retiros - devol;
    return { docs, porMedio: MEDIOS.map(m => por[m]), ventas, devol, retiros, efectivo, n: docs.filter(d => d.tipo !== "NC").length };
  }
  function abrir(locId, n, cajero, fondo) {
    const t = nuevoTurno(locId, n, cajero, ahora(), fondo);
    anotar("Abrió caja", locDe(locId).nom + " · caja " + n + " · fondo ₡" + fondo, cajero, locId, "Baja");
    return t;
  }
  function retirar(t, monto, motivo, recibe) {
    t.retiros.push({ hora: ahora(), monto, motivo, recibe });
    anotar("Retiró efectivo de caja", locDe(t.locId).nom + " · caja " + t.n + " · ₡" + monto + " · " + motivo, t.cajero, t.locId, "Media", "", recibe);
  }
  function cerrar(t, contado, justificacion, por) {
    const r = resumen(t);
    const dif = Math.round(contado - r.efectivo);
    t.cierre = { hora: ahora(), contado, diferencia: dif, justificacion: justificacion || "", por: por || t.cajero };
    t.estado = "Cerrada";
    CIERRES.unshift({ fecha: t.cierre.hora, locId: t.locId, n: t.n, cajero: t.cajero, ventas: r.ventas, diferencia: dif, justificacion: justificacion || "" });
    anotar("Cerró caja", locDe(t.locId).nom + " · caja " + t.n + " · diferencia ₡" + dif, t.cajero, t.locId, dif ? "Media" : "Baja");
    return dif;
  }

  /* ═══ 7 · PROFORMAS Y PEDIDOS (VEN-003, VEN-019, REP-009, INT-008) ═══ */
  const ZONA = { "Turrialba centro": "Turrialba centro", "Turrialba": "Turrialba centro", "Santa Rosa": "Santa Rosa y alrededores", "Pacayas": "Pacayas / Cervantes", "Cervantes": "Pacayas / Cervantes", "Pejibaye": "Pejibaye", "Tucurrique": "Tucurrique", "El Centro": "Turrialba centro" };
  function flete(zona, kg) {
    const t = D.tarifario.find(x => x.zona === zona) || D.tarifario.find(x => x.zona === "Fuera de cantón");
    const v = kg <= 5000 ? t.hasta5t : kg <= 10000 ? t.hasta10t : t.mas10t;
    return { zona: t.zona, monto: v || 0 };
  }
  const MOTIVOS = ["Precio", "Sin existencia al momento", "El cliente no respondió", "Compró en otro lado", "Cambió el proyecto"];
  const ESTPED = ["Por confirmar existencia", "Esperando pago", "Pagado · por facturar", "Listo para facturar"];
  /* completa la proforma con vendedor, peso y flete; las que se guardan
     desde la caja pasan por aquí la primera vez que se muestran */
  function prep(p) {
    if (p._prep) return p;
    p._prep = true;
    const i = Math.max(0, D.proformas.indexOf(p));
    const cli = D.cliById[p.clienteId];
    p.vendedor = p.vendedor || D.VENDEDORES[i % D.VENDEDORES.length];
    p.peso = w.pesoLineas(p.lineas);
    p.flete = flete(cli ? ZONA[cli.dir] || "Fuera de cantón" : "Turrialba centro", p.peso);
    if (p.tipo === "Pedido" && !p.estadoPed) {
      if (p.origen === "Mostrador" && i % 2 === 0) p.origen = "WhatsApp";
      p.estadoPed = p.estado === "Vencida" ? "Vencido" : ESTPED[i % ESTPED.length];
      if (p.estadoPed === "Esperando pago") p.link = { enviado: dia(0, 9, 12), medio: "WhatsApp", codigo: "FSR-" + pad(4810 + i, 6) };
    }
    if (p.estado === "Vencida") p.motivo = i % 3 === 0 ? null : MOTIVOS[i % MOTIVOS.length];
    p.contacto = dia(1 + (i % 4), 10 + (i % 6));
    if (p.origen === "Mostrador" && p.fecha > dia(1)) { p.vendedor = p.vendedor || "Kevin Solano"; }
    return p;
  }
  [["C2", "WhatsApp", "Por confirmar existencia", [["FER-01042", 25], ["FER-02218", 40], ["FER-01880", 300]]],
   ["C13", "Tienda virtual", "Pagado · por facturar", [["FER-05120", 4], ["FER-00915", 12], ["FER-01120", 30]]]].forEach((x, k) => {
    const lineas = x[3].map(y => { const a = byCod(y[0]); return { artId: a.id, cant: y[1], precio: a.precio, desc: 0 }; });
    D.seq.PROF++;
    D.proformas.unshift(Object.assign({
      id: "PF-" + D.seq.PROF, cons: "PROF-" + pad(D.seq.PROF, 6), tipo: "Pedido", fecha: dia(k, 8 + k, 20), clienteId: x[0], locId: "L1", lineas,
      vence: dia(-7), estado: "Vigente", origen: x[1], estadoPed: x[2], vendedor: "Kevin Solano"
    }, D.totalizar(lineas), x[2] === "Pagado · por facturar" ? { link: { enviado: dia(0, 7, 50), medio: "Página web", codigo: "FSR-004902" }, pagado: dia(0, 8, 5) } : {}));
  });
  D.proformas.forEach(prep);
  /* ventas perdidas del mes que ya no están en la lista de trabajo */
  const PERDIDAS = [
    ["Desarrollos Reventazón S.A.", 3860400, "Precio", 9], ["Ingeniería Quesada Ltda.", 1240800, "Sin existencia al momento", 11],
    ["Marvin Céspedes Araya", 186300, "El cliente no respondió", 6], ["Techos y Estructuras del Este S.A.", 2410000, "Precio", 4],
    ["Coopeagri R.L.", 920500, "Compró en otro lado", 8], ["Finca La Esperanza S.R.L.", 412700, "Cambió el proyecto", 3],
    ["José Manuel Alfaro Chinchilla", 98400, "El cliente no respondió", 2], ["Municipalidad de Jiménez", 5120000, "Sin existencia al momento", 12]
  ].map((x, i) => ({ id: "PP" + (i + 1), cons: "PROF-" + pad(1180 + i * 7, 6), cliente: x[0], total: x[1], motivo: x[2], fecha: dia(x[3]) }));
  function perdidas() {
    const vivas = D.proformas.filter(p => p.estado === "Vencida").map(p => ({ id: p.id, cons: p.cons, cliente: (D.cliById[p.clienteId] || {}).nom || "Consumidor final", total: p.total, motivo: p.motivo, fecha: p.vence, viva: p }));
    return vivas.concat(PERDIDAS).sort((a, b) => b.fecha - a.fecha);
  }
  function enviarLink(p, medio) {
    p.link = { enviado: ahora(), medio: medio || "WhatsApp", codigo: "FSR-" + pad(5000 + Math.floor(Math.random() * 900), 6) };
    if (p.tipo === "Pedido") p.estadoPed = "Esperando pago";
    anotar("Envió link de pago", p.cons + " · " + (D.cliById[p.clienteId] || {}).nom, "Kevin Solano", p.locId, "Baja");
  }
  function confirmarPago(p) { p.estadoPed = "Pagado · por facturar"; p.pagado = ahora(); anotar("Confirmó pago de pedido", p.cons, "Sistema", p.locId, "Baja"); }
  function marcarPerdida(p, motivo) { p.estado = "Vencida"; p.motivo = motivo; anotar("Marcó proforma como perdida", p.cons + " · " + motivo, "Kevin Solano", p.locId, "Baja"); }

  /* ═══ 8 · ENTREGAS Y RETIROS (VEN-004, VEN-005, VEN-006) ═══ */
  const CAP = { "Furgoneta 3": 1500, "Camión 5": 5000, "Cabezal 07": 12000, "Cabezal 12": 12000, "Pick-up 2": 800 };
  const AUTORIZADOS = {};  /* cédula y vigencia de quienes pueden retirar a nombre del cliente */
  D.clientes.forEach((c, i) => {
    AUTORIZADOS[c.id] = c.tipoCed === "Jurídica"
      ? [{ nom: ["Luis Diego Brenes", "Carlos Monge", "Wálter Solano", "Johnny Cordero"][i % 4], ced: "3-0" + (412 + i) + "-0" + (221 + i), rol: "Bodeguero de obra", vence: dia(-120) },
         { nom: ["Óscar Chacón", "Rafael Mora", "Minor Gómez", "Allan Pereira"][i % 4], ced: "1-0" + (905 + i) + "-0" + (310 + i), rol: "Chofer autorizado", vence: i % 5 === 0 ? dia(6) : dia(-90) }]
      : [];
  });
  function modalidad(x) { return x.retiroEn !== x.locId ? "Retiro en otro local" : x.ruta === "Retiro en local" ? "Retira después" : "Entrega a domicilio"; }
  /* tres casos que el demo necesita: retiro aquí de una venta de Turrialba, voluminoso sin despachar y entregado hoy con constancia */
  (function extras() {
    const mk = (id, doc, cli, loc, ret, ruta, lineas, estado, f) => {
      D.despachos.push({ id, doc, clienteId: cli, locId: loc, retiroEn: ret, ruta, vehiculo: ruta === "Retiro en local" ? "—" : "Camión 5", lineas, estado, fecha: f });
    };
    const L = (cod, cant) => ({ artId: byCod(cod).id, cant, precio: byCod(cod).precio, desc: 0 });
    mk("DS-04301", "003-00002-01-0000018866", "C3", "L2", "L1", "Retiro en local", [L("FER-02218", 80), L("FER-01042", 30)], "Alistado", dia(0, 8, 40));
    mk("DS-04302", "002-00001-01-0000035201", "C10", "L1", "L1", "Retiro en local", [L("FER-03771", 48), L("FER-03840", 600)], "Pendiente de alistar", dia(2, 15, 10));
    mk("DS-04303", "002-00002-01-0000035193", "C1", "L1", "L1", "Turrialba centro", [L("FER-01880", 450), L("FER-01042", 20)], "Entregado", dia(0, 7, 55));
  })();
  D.despachos.forEach((x, i) => {
    x.modalidad = modalidad(x);
    x.peso = w.pesoLineas(x.lineas);
    x.auto = x.peso >= PARAM.pesoNoDespacho;     /* se marcó solo por peso */
    if (x.estado === "Entregado") {
      const au = AUTORIZADOS[x.clienteId] || [];
      x.recibio = au.length ? { nom: au[i % au.length].nom, ced: au[i % au.length].ced, autorizado: true, firma: true, hora: x.id === "DS-04303" ? dia(0, 9, 20) : x.fecha }
        : { nom: (D.cliById[x.clienteId] || {}).nom || "Cliente de contado", ced: (D.cliById[x.clienteId] || {}).ced || "", autorizado: true, firma: true, hora: x.fecha };
    }
    /* VEN-006: al facturar, lo que se retira en otro local queda reservado allá */
    if (x.retiroEn !== x.locId && x.estado !== "Entregado") {
      x.reserva = x.lineas.map(l => {
        const e = D.stock(l.artId, x.retiroEn);
        const ok = e && e.cant - e.comp >= l.cant;
        if (ok) e.comp += l.cant;
        return { artId: l.artId, cant: l.cant, ok };
      });
    }
  });
  STATS.reservas = D.despachos.filter(x => x.reserva && x.reserva.every(r => r.ok)).length;
  function alistar(x, quien) { x.estado = "Alistado"; anotar("Alistó despacho", x.id + " · " + x.doc, quien || "Bodega", x.locId, "Baja"); }
  function asignar(x, rutaId) {
    const r = D.rutas.find(y => y.id === rutaId); if (!r) return null;
    x.ruta = r.nom; x.vehiculo = r.vehiculo; x.estado = "En ruta"; x.salida = ahora();
    const carga = D.despachos.filter(y => y.vehiculo === r.vehiculo && y.estado === "En ruta").reduce((s, y) => s + y.peso, 0);
    anotar("Asignó despacho a ruta", x.id + " · " + r.nom, "Bodega", x.locId, "Baja");
    return { carga, cap: CAP[r.vehiculo] || 5000 };
  }
  function entregar(x, persona) {
    x.estado = "Entregado"; x.recibio = Object.assign({ hora: ahora(), firma: true }, persona);
    (x.reserva || []).forEach(r => { if (!r.ok) return; const e = D.stock(r.artId, x.retiroEn); if (e) e.comp = Math.max(0, e.comp - r.cant); });
    anotar("Entregó mercadería", x.id + " · " + x.doc + " · recibió " + persona.nom, "Bodega", x.retiroEn, persona.autorizado ? "Baja" : "Alta");
  }

  /* ═══ 9 · DEVOLUCIONES Y NOTAS DE CRÉDITO (VEN-011, VEN-012, VEN-024) ═══ */
  const CONCEPTOS = [
    { id: "Devolución de mercadería", inv: true, d: "El cliente trae el producto de vuelta" },
    { id: "Garantía", inv: true, d: "Producto defectuoso dentro del plazo de garantía" },
    { id: "Descuento posterior", inv: false, d: "Se rebaja el precio después de facturar" },
    { id: "Exoneración", inv: false, d: "Se aplica una exoneración que no se consideró" },
    { id: "Financiera", inv: false, d: "Pronto pago u otro ajuste financiero" },
    { id: "Intereses", inv: false, d: "Reverso de intereses cobrados" },
    { id: "Promocional", inv: false, d: "Promoción aplicada después de la venta" },
    { id: "Rebajo de planilla", inv: false, d: "Compra de un colaborador que se rebaja del salario" }
  ];
  const DESTINOS = ["Vuelve a la venta", "Producto de segunda", "Devolución al proveedor"];
  const REINTEGROS = ["Efectivo", "A la misma tarjeta", "SINPE móvil", "Saldo a favor del cliente", "Rebaja de la cuenta por cobrar"];
  D.documentos.filter(d => d.tipo === "NC").forEach((d, i) => { d.reintegro = d.reintegro || REINTEGROS[i % 4]; d.destino = d.destino || DESTINOS[i % 2]; d.firma = true; });
  /* VEN-024: observaciones por línea que salen impresas (cortes y medidas) */
  const NOTAS = { TEC: "Cortar a 2,40 m", FON: "Cortar a 3 m y roscar", MAT: "Varilla cortada a 1,20 m" };
  let nn = 0;
  D.documentos.forEach(d => { if (nn > 14 || d.tipo === "NC") return; d.lineas.forEach(l => { const a = D.artById[l.artId]; if (a && NOTAS[a.fam] && !l.nota && nn <= 14 && (l.cant % 3 === 0)) { l.nota = NOTAS[a.fam]; nn++; } }); });
  const devuelto = (d, artId) => D.documentos.filter(n => n.tipo === "NC" && n.refiere === d.cons).reduce((s, n) => s + n.lineas.filter(l => l.artId === artId).reduce((k, l) => k + l.cant, 0), 0);

  const BOLETAS = [];
  (function () {
    const grande = d => d.lineas.find(l => l.cant * l.precio * 1.13 * 0.6 > PARAM.devolucionSinAprobacion);
    const fe = D.documentos.filter(d => d.tipo === "FE" && d.clienteId && grande(d));
    [fe[1], fe[4]].forEach((d, i) => {
      if (!d) return;
      const l = grande(d);
      const lineas = [{ artId: l.artId, cant: Math.max(1, Math.round(l.cant * (i ? 0.6 : 1))), precio: l.precio, desc: l.desc || 0 }];
      const t = D.totalizar(lineas);
      BOLETAS.push({ id: "BD-" + pad(812 + i, 5), doc: d, lineas, total: t.total, concepto: i ? "Garantía" : "Devolución de mercadería", destino: i ? "Devolución al proveedor" : "Vuelve a la venta", reintegro: d.condicion === "Crédito" ? "Rebaja de la cuenta por cobrar" : "Saldo a favor del cliente", solicita: i ? "Marta Rojas" : "Kevin Solano", locId: i ? "L2" : "L1", fecha: dia(0, 9 + i, 20), firma: true, estado: "Por aprobar", motivo: i ? "La sierra no enciende; tiene 3 meses de uso" : "Sobró material de la obra" });
    });
  })();
  /* emite la nota de crédito: inventario, cartera, bitácora */
  function emitirNC(o) {
    const d = o.doc;
    const lineas = o.lineas.filter(l => l.cant > 0).map(l => ({ artId: l.artId, cant: l.cant, precio: l.precio, desc: l.desc || 0, nota: l.nota }));
    const t = D.totalizar(lineas);
    const cons = D.consecutivo("NC", o.locId || d.locId, o.term || d.term);
    const nc = {
      id: "NC-" + cons.slice(-6), tipo: "NC", cons, clave: D.clave(cons), fecha: ahora(), locId: o.locId || d.locId, term: o.term || d.term,
      clienteId: d.clienteId, vendedor: d.vendedor, lineas, ...t, condicion: "Contado", medio: "Devolución",
      hacienda: o.offline ? "En cola" : "Aceptado", costo: D.costoLineas(lineas), saldo: 0, refiere: d.cons,
      concepto: o.concepto, reintegro: o.reintegro, destino: o.destino, firma: !!o.firma, margen: 0
    };
    D.documentos.unshift(nc);
    const conc = CONCEPTOS.find(c => c.id === o.concepto);
    if (conc && conc.inv && o.destino === "Vuelve a la venta") lineas.forEach(l => D.mover(l.artId, nc.locId, l.cant, "Devolución", cons, nc.fecha));
    if (o.reintegro === "Rebaja de la cuenta por cobrar" && d.saldo > 0) {
      const r = Math.min(d.saldo, nc.total); d.saldo -= r;
      if (D.cliById[d.clienteId]) D.cliById[d.clienteId].saldo -= r;
    }
    anotar("Aplicó nota de crédito", "NC " + cons + " · " + o.concepto + " · sobre " + d.cons, o.usuario || "Kevin Solano", nc.locId, "Media", "", "₡" + t.total);
    return nc;
  }
  function aprobarBoleta(b, quien) {
    const nc = emitirNC({ doc: b.doc, lineas: b.lineas, concepto: b.concepto, destino: b.destino, reintegro: b.reintegro, firma: b.firma, locId: b.locId, usuario: quien });
    b.estado = "Aprobada"; b.nc = nc.cons; b.aprobo = quien;
    return nc;
  }

  /* ═══ 10 · FICHA DEL CLIENTE (VEN-023, FEL-005, SIS-004) ═══ */
  const ACT = {
    "Constructora": ["4100", "Construcción de edificios"], "Maestro de obra": ["4390", "Otras actividades especializadas de construcción"],
    "Ingeniero": ["7110", "Actividades de arquitectura e ingeniería"], "Institucional": ["8411", "Administración pública en general"],
    "Agropecuario": ["0111", "Cultivo de café y otros productos agrícolas"]
  };
  const FICHA = {};
  D.clientes.forEach((c, i) => {
    const act = c.nom.indexOf("ASADA") === 0 ? ["3600", "Captación, tratamiento y distribución de agua"]
      : c.nom.indexOf("Coopeagri") === 0 ? ["4630", "Venta al por mayor de alimentos, bebidas y tabaco"] : ACT[c.categoria] || null;
    const corto = c.nom.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    FICHA[c.id] = {
      actividad: act ? { cod: act[0], desc: act[1] } : null,
      exoneraciones: c.exonerado ? [{ numero: "AL-" + pad(1024300 + i * 17, 8) + "-26", tipo: "Exoneración institucional", institucion: "Ministerio de Hacienda", pct: 13, vence: dia(-210) }]
        .concat(i === 3 ? [{ numero: "AL-00987712-25", tipo: "Proyecto de acueducto", institucion: "AyA", pct: 13, vence: dia(12) }] : []) : [],
      contactos: c.tipoCed === "Jurídica"
        ? [{ nom: ["Adriana Vindas", "Mauricio Céspedes", "Paola Quesada", "Hernán Solís"][i % 4], puesto: "Proveeduría", tel: c.tel, correo: "compras@" + corto + ".cr", comprobantes: true },
           { nom: ["Luis Diego Brenes", "Carlos Monge", "Wálter Solano", "Johnny Cordero"][i % 4], puesto: "Maestro de obras", tel: "8" + pad(610 + i * 13, 3) + "-" + pad(2200 + i * 71, 4), correo: "", comprobantes: false }]
        : [{ nom: c.nom, puesto: "Titular", tel: c.tel, correo: corto + "@correo.cr", comprobantes: true }],
      direcciones: [{ nom: "Dirección fiscal", dir: c.dir, zona: ZONA[c.dir] || "Fuera de cantón", principal: true }]
        .concat(c.tipoCed === "Jurídica" && c.limite ? [{ nom: ["Obra Residencial Las Américas", "Bodega de proyectos", "Obra Colegio de Pejibaye", "Tanque de captación"][i % 4], dir: ["Turrialba, 300 m norte del estadio", "La Isabel, frente a la escuela", "Pejibaye centro", "Tucurrique, camino a Cachí"][i % 4], zona: ["Turrialba centro", "Santa Rosa y alrededores", "Pejibaye", "Tucurrique"][i % 4], principal: false }] : []),
      territorio: ZONA[c.dir] || "Fuera de cantón",
      vendedor: D.VENDEDORES[i % D.VENDEDORES.length],
      correoFE: c.tipoCed === "Jurídica" ? "facturas@" + corto + ".cr" : corto + "@correo.cr",
      activo: true,
      sobregiros: i === 0 ? [{ fecha: dia(21), monto: 380000, autorizo: "Adrián Vindas", motivo: "Colado de losa; el pago entra el viernes" }] : []
    };
  });
  /* el cliente de la demostración en la caja está al día: se cobraron sus facturas más atrasadas */
  (function () {
    const c = D.cliById.C1; if (!c) return;
    D.documentos.filter(d => d.clienteId === "C1" && d.saldo > 0 && diasEntre(d.fecha, HOY) > c.plazo + 20)
      .forEach(d => { c.saldo -= d.saldo; d.saldo = 0; });
  })();
  const vencidas = cliId => { const c = D.cliById[cliId]; return D.documentos.filter(d => d.clienteId === cliId && d.saldo > 0 && diasEntre(d.fecha, HOY) > (c ? c.plazo : 30)); };
  function bloqueo(cliId) {
    const c = D.cliById[cliId]; if (!c || !c.limite) return null;
    const v = vencidas(cliId), mas = v.filter(d => diasEntre(d.fecha, HOY) > c.plazo + PARAM.diasBloqueo);
    if (mas.length) return { k: "cr", t: "Crédito bloqueado", d: mas.length + (mas.length === 1 ? " factura vencida" : " facturas vencidas") + " hace más de " + PARAM.diasBloqueo + " días. La caja no deja facturar a crédito hasta que se ponga al día o alguien con permiso lo autorice." };
    if (c.saldo > c.limite) return { k: "cr", t: "Límite excedido", d: "El saldo pasa el límite de crédito; la caja pide autorización para vender a crédito." };
    if (v.length) return { k: "wa", t: "Con facturas vencidas", d: "La caja avisa al facturar, pero todavía deja vender a crédito." };
    return null;
  }

  /* ═══ 11 · VENDEDORES, METAS Y COMISIONES (VEN-013, VEN-026) ═══ */
  const LOCVEN = { "Kevin Solano": "L1", "Marta Rojas": "L2", "Jonathan Ureña": "L2", "Sofía Camacho": "L3", "Randall Mata": "L1", "Yeimy Picado": "L1" };
  const COMISION = { MAT: 0.5, TEC: 0.8, FON: 1.2, ELE: 1.2, HER: 1.5, PIN: 1.2, FGE: 1.5, JAR: 1, SEG: 1 };
  const REGLAS = { soloCobrado: true, sinBajoMargen: true, bonoMeta: 10 };
  const inicioMes = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
  function desempeno() {
    return D.VENDEDORES.map((v, i) => {
      const docs = D.documentos.filter(d => d.vendedor === v && d.fecha >= inicioMes);
      let venta = 0, costo = 0, desc = 0, bruto = 0, com = 0, n = 0;
      docs.forEach(d => {
        const s = d.tipo === "NC" ? -1 : 1;
        if (d.tipo !== "NC") n++;
        venta += s * (d.grav + d.exe); costo += s * d.costo; desc += s * d.desc;
        const cobrado = d.tipo === "NC" || !d.saldo;
        d.lineas.forEach(l => {
          const a = D.artById[l.artId]; if (!a) return;
          const neto = l.cant * l.precio * (1 - (l.desc || 0) / 100);
          bruto += s * l.cant * l.precio;
          const m = a.costo ? ((l.precio * (1 - (l.desc || 0) / 100) - a.costo) / (l.precio * (1 - (l.desc || 0) / 100))) * 100 : 100;
          if ((!REGLAS.soloCobrado || cobrado) && (!REGLAS.sinBajoMargen || m >= (D.famById[a.fam].min || 0))) com += s * neto * (COMISION[a.fam] || 0) / 100;
        });
      });
      const avance = [0.82, 1.04, 0.61, 0.74, 0.93, 0.48][i % 6];
      const meta = Math.max(1000000, Math.round(venta / avance / 100000) * 100000);
      const bono = venta >= meta ? com * REGLAS.bonoMeta / 100 : 0;
      const aut = AUT.filter(x => x.solicita === v).length;
      return { v, locId: LOCVEN[v] || "L1", n, venta, margen: venta ? ((venta - costo) / venta) * 100 : 0, ticket: n ? venta / n : 0, descPct: bruto ? (desc / bruto) * 100 : 0, meta, comision: Math.round(com + bono), bono: Math.round(bono), aut };
    });
  }
  const MOSTRADOR = {};
  D.tiendas.forEach(l => { MOSTRADOR[l.id] = { compartido: l.terminales > 1, clave: l.terminales > 1 }; });
  MOSTRADOR.L5.clave = false; MOSTRADOR.L7.clave = false;
  const PIN = {}; D.VENDEDORES.forEach((v, i) => { PIN[v] = i !== 4; });
  const CAMBIOS_VEND = [
    { fecha: dia(0, 10, 31), locId: "L1", term: 2, de: "Yeimy Picado", a: "Randall Mata", clave: true },
    { fecha: dia(0, 8, 2), locId: "L2", term: 1, de: "—", a: "Marta Rojas", clave: true },
    { fecha: dia(1, 15, 47), locId: "L1", term: 1, de: "Kevin Solano", a: "Randall Mata", clave: false, nota: "Randall no tenía clave registrada; se pidió al administrador" }
  ];

  /* ═══ 12 · PENDIENTES DE VENTAS: lo que necesita a una persona hoy ═══ */
  function pendientes(locId) {
    D.proformas.forEach(prep);
    const P = [], de = x => !locId || x === locId;
    const ln = id => (locDe(id) || {}).nom || "—";
    AUT.filter(x => x.estado === "Pendiente" && de(x.locId)).forEach(x => P.push({ grupo: "Autorizar", k: "cr", ic: "shield", t: "Autorizar " + (x.a ? x.a.desc : "línea") + " bajo el margen", d: x.solicita + " · caja " + x.term + " de " + ln(x.locId) + " · margen " + String(x.margen).replace(".", ",") + " % contra " + x.min + " % · " + x.motivo, btn: "Revisar", ir: "ven-precios|autorizaciones" }));
    BOLETAS.filter(b => b.estado === "Por aprobar" && de(b.locId)).forEach(b => P.push({ grupo: "Autorizar", k: "wa", ic: "swap", t: "Aprobar devolución de ₡" + String(Math.round(b.total)).replace(/\B(?=(\d{3})+(?!\d))/g, " "), d: (D.cliById[b.doc.clienteId] || {}).nom + " · " + b.concepto + " · pasa del tope de ₡100 000 sin aprobación", btn: "Revisar", ir: "documentos|devolver:" + b.id }));
    D.despachos.filter(x => x.estado !== "Entregado" && x.estado !== "En ruta" && x.retiroEn !== x.locId && de(x.retiroEn)).forEach(x => P.push({ grupo: "Entregar", k: "", ic: "pin", t: "Retiro para este local · " + (D.cliById[x.clienteId] || {}).nom, d: "Facturado en " + ln(x.locId) + " · " + x.lineas.length + " líneas reservadas aquí · " + x.estado.toLowerCase(), btn: "Entregar", ir: "despachos|retiros" }));
    D.despachos.filter(x => x.estado === "Pendiente de alistar" && de(x.locId)).forEach(x => { const d = diasEntre(x.fecha, HOY); P.push({ grupo: "Entregar", k: d >= 2 ? "wa" : "", ic: "box", t: "Alistar " + x.id + " · " + (D.cliById[x.clienteId] || {}).nom, d: x.modalidad + " · " + Math.round(x.peso) + " kg · facturado hace " + d + (d === 1 ? " día" : " días"), btn: "Alistar", ir: "despachos|pordespachar" }); });
    D.proformas.filter(p => p.estado === "Vigente" && de(p.locId)).forEach(p => {
      const d = diasEntre(HOY, p.vence);
      if (p.tipo === "Pedido" && (p.estadoPed === "Por confirmar existencia" || p.estadoPed === "Pagado · por facturar")) P.push({ grupo: "Dar seguimiento", k: p.estadoPed === "Pagado · por facturar" ? "wa" : "", ic: p.origen === "Mostrador" ? "file" : "chat", t: (p.estadoPed === "Pagado · por facturar" ? "Facturar pedido pagado · " : "Confirmar existencia del pedido · ") + (D.cliById[p.clienteId] || {}).nom, d: p.cons + " · " + p.origen + " · " + p.lineas.length + " líneas", btn: p.estadoPed === "Pagado · por facturar" ? "Facturar" : "Revisar", ir: "cotizaciones|pedidos" });
      else if (p.tipo === "Proforma" && d <= 3) P.push({ grupo: "Dar seguimiento", k: "wa", ic: "clock", t: "Proforma por vencer · " + (D.cliById[p.clienteId] || {}).nom, d: p.cons + " · vence " + (d <= 0 ? "hoy" : "en " + d + (d === 1 ? " día" : " días")) + " · " + p.vendedor, btn: "Llamar", ir: "cotizaciones|proformas" });
    });
    const sinMotivo = D.proformas.filter(p => p.estado === "Vencida" && !p.motivo && de(p.locId)).length;
    if (sinMotivo) P.push({ grupo: "Dar seguimiento", k: "", ic: "info", t: sinMotivo + (sinMotivo === 1 ? " proforma vencida sin motivo" : " proformas vencidas sin motivo"), d: "Anotar por qué no se compró alimenta el informe de ventas perdidas", btn: "Anotar", ir: "cotizaciones|perdidas" });
    const nuevosRel = (typeof APREND !== "undefined" ? APREND : []).filter(x => x.estado === "Propuesta").length;
    if (nuevosRel) P.push({ grupo: "Dar seguimiento", k: "", ic: "sparkle", t: nuevosRel + " complementos nuevos detectados en las ventas", d: "El sistema los encontró anoche en las facturas; entran a la caja cuando alguien los aprueba", btn: "Revisar", ir: "ven-relacionados|aprendidas" });
    TURNOS.filter(t => t.estado === "Abierta" && de(t.locId)).forEach(t => {
      if (!esHoy(t.abre)) P.push({ grupo: "Caja", k: "cr", ic: "cash", t: "La caja " + t.n + " de " + ln(t.locId) + " quedó abierta desde ayer", d: t.cajero + " · abrió " + String(t.abre.getDate()).padStart(2, "0") + "/" + (t.abre.getMonth() + 1) + " · hay que hacer el arqueo antes de seguir vendiendo en ella", btn: "Cerrar", ir: "caja|local" });
      else { const r = resumen(t); if (r.efectivo > PARAM.topeEfectivo) P.push({ grupo: "Caja", k: "wa", ic: "cash", t: "Retiro sugerido en la caja " + t.n + " de " + ln(t.locId), d: t.cajero + " · tiene ₡" + String(Math.round(r.efectivo)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " en efectivo; el tope es ₡300 000", btn: "Retirar", ir: "caja|local" }); }
    });
    CIERRES.filter(x => x.diferencia && !x.justificacion && de(x.locId)).forEach(x => P.push({ grupo: "Caja", k: "wa", ic: "alert", t: "Diferencia sin justificar en la caja " + x.n + " de " + ln(x.locId), d: x.cajero + " · ₡" + x.diferencia + " el " + x.fecha.getDate() + "/" + (x.fecha.getMonth() + 1), btn: "Justificar", ir: "caja|local" }));
    return P;
  }


  /* ═══ 13 · PRODUCTOS RELACIONADOS (VEN-016) ═══
     Lo que el vendedor experto sugiere de memoria, en la caja para todos.
     Dos fuentes: reglas que escribe alguien que conoce el oficio, y pares que
     el sistema detecta en las facturas y una persona aprueba antes de que
     lleguen a la caja. La cantidad sale de la línea: 28 láminas, 224 tornillos. */
  /* Una regla por artículo que dispara la sugerencia, con hasta 6 sugeridos
     en el orden en que salen en la caja (el primero es Alt 1). */
  const MAX_SUG = 6;
  const REGLAS_REL = [];
  let rseq = 1;
  const semilla = (cod, k) => { let h = 0; for (const ch of cod + k) h = (h * 31 + ch.charCodeAt(0)) % 997; return h; };
  function sug(cod, o) {
    const x = Object.assign({ cod, por: null, fijo: null, nota: "", conf: 0.5, origen: "Experto" }, o);
    if (x.mostradas == null) { x.mostradas = 90 + semilla(cod, x.nota.length) % 520; x.aceptadas = Math.round(x.mostradas * x.conf * 0.58); }
    return x;
  }
  function regla(si, sugeridos, o) {
    const r = Object.assign({ id: "RR" + String(rseq++).padStart(3, "0"), si, sugeridos, autor: "Marta Rojas", activa: true, desde: dia(60), cambio: dia(20) }, o);
    REGLAS_REL.push(r); return r;
  }
  const TORN = n => sug("FER-03840", { por: n, nota: n + " tornillos con empaque por lámina", conf: 0.92 });
  const PERL = sug.bind(null, "FER-03810");
  const TEFL = () => sug("FER-01455", { fijo: 2, nota: "Teflón para las roscas", conf: 0.88, autor: "Kevin Solano" });
  const SOLV = (por, nota) => sug("FER-01330", por ? { por, nota, conf: 0.74 } : { fijo: 1, nota, conf: 0.6 });
  const GUAN = () => sug("FER-09020", { fijo: 1, nota: "Guantes para trabajar", conf: 0.31 });
  const RODI = () => sug("FER-05310", { fijo: 1, nota: "Rodillo por cada juego de pintura", conf: 0.63 });
  const INST = () => sug("SRV-003", { fijo: 1, nota: "Si el cliente no la instala, la instalamos", conf: 0.22 });
  regla("FER-00915", [
    sug("FER-01120", { por: 2, nota: "Dos codos por tubo en una instalación típica", conf: 0.81 }),
    SOLV(0.1, "Un cemento solvente cada 10 tubos"),
    sug("FER-02310", { por: 1, nota: "Una unión por tubo", conf: 0.46 }),
    TEFL(),
    sug("FER-01122", { por: 0.5, nota: "Una tee cada dos tubos para las derivaciones", conf: 0.41 }),
    sug("FER-02201", { fijo: 1, nota: "Llave de paso a la entrada de la instalación", conf: 0.34 })
  ], { autor: "Kevin Solano" });
  regla("FER-00917", [SOLV(0.1, "Un cemento solvente cada 10 tubos"), sug("FER-02455", { fijo: 2, nota: "Reducciones para bajar a ½\" en los puntos de agua", conf: 0.52 }), TEFL()], { autor: "Kevin Solano" });
  regla("FER-03220", [SOLV(0.2, "Un cemento solvente cada 5 tubos sanitarios")], { autor: "Kevin Solano" });
  regla("FER-03004", [TEFL(), sug("FER-02201", { fijo: 1, nota: "La llave de paso para poder cambiarla después", conf: 0.44 }), INST()], { autor: "Kevin Solano" });
  regla("FER-03118", [TEFL(), SOLV(null, "Para pegar el sifón al desagüe"), INST()], { autor: "Marta Rojas" });
  regla("FER-02201", [TEFL()], { autor: "Kevin Solano" });
  regla("FER-03771", [TORN(8), PERL({ por: 0.5, nota: "Un perling cada dos láminas", conf: 0.48 })]);
  regla("FER-03774", [TORN(10), PERL({ por: 0.5, nota: "Un perling cada dos láminas", conf: 0.48 })]);
  regla("FER-03780", [TORN(8)]);
  regla("FER-01042", [sug("FER-01060", { por: 0.1, nota: "0,1 m³ de arena por saco (mezcla 1:3)", conf: 0.71 }), sug("FER-01062", { por: 0.12, nota: "0,12 m³ de piedra por saco para concreto", conf: 0.54 })], { autor: "Jonathan Ureña" });
  regla("FER-01045", [sug("FER-01060", { por: 0.1, nota: "0,1 m³ de arena por saco (mezcla 1:3)", conf: 0.69 }), sug("FER-01062", { por: 0.12, nota: "0,12 m³ de piedra por saco para concreto", conf: 0.58 })], { autor: "Jonathan Ureña" });
  regla("FER-02218", [sug("FER-02240", { por: 0.05, nota: "1 kg de alambre cada 20 varillas", conf: 0.83 }), sug("FER-04502", { fijo: 2, nota: "Discos para cortar la varilla", conf: 0.38, origen: "Aprendida" })], { autor: "Jonathan Ureña" });
  regla("FER-02220", [sug("FER-02240", { por: 0.05, nota: "1 kg de alambre cada 20 varillas", conf: 0.81 }), sug("FER-04502", { fijo: 2, nota: "Discos para cortar la varilla", conf: 0.36, origen: "Aprendida" })], { autor: "Jonathan Ureña" });
  regla("FER-01880", [sug("FER-01042", { por: 1 / 35, nota: "Un saco de cemento cada 35 bloques", conf: 0.77 }), sug("FER-01060", { por: 1 / 300, nota: "Arena para el mortero de pega", conf: 0.52 }), sug("FER-02218", { por: 1 / 8, nota: "Una varilla de refuerzo cada 8 bloques", conf: 0.44 })]);
  regla("FER-01884", [sug("FER-01042", { por: 1 / 30, nota: "Un saco de cemento cada 30 bloques", conf: 0.75 }), sug("FER-01060", { por: 1 / 250, nota: "Arena para el mortero de pega", conf: 0.5 })]);
  regla("FER-05120", [RODI(), GUAN()], { autor: "Sofía Camacho" });
  regla("FER-05124", [RODI(), GUAN()], { autor: "Sofía Camacho" });
  regla("FER-05210", [RODI(), GUAN()], { autor: "Sofía Camacho" });
  regla("FER-04502", [GUAN()], { autor: "Sofía Camacho" });
  regla("FER-04101", [sug("FER-04310", { por: 1 / 3, nota: "Un tubo conduit cada 3 m de cable", conf: 0.66 }), sug("FER-04330", { por: 0.1, nota: "Una caja cada 10 m de cable", conf: 0.58 })], { autor: "Randall Mata" });
  regla("FER-04104", [sug("FER-04310", { por: 1 / 3, nota: "Un tubo conduit cada 3 m de cable", conf: 0.61 }), sug("FER-04330", { por: 0.1, nota: "Una caja cada 10 m de cable", conf: 0.55 })], { autor: "Randall Mata" });
  regla("FER-04225", [sug("FER-04330", { por: 1, nota: "Una caja por lámpara", conf: 0.57 })], { autor: "Randall Mata" });
  regla("FER-08010", [sug("FER-08040", { fijo: 1, nota: "Aspersor para la manguera", conf: 0.37 })], { autor: "Sofía Camacho" });
  const reglaDe = cod => REGLAS_REL.find(r => r.si === cod) || null;

  /* pares que el sistema encontró anoche en 90 días de facturas y esperan visto bueno */
  const APREND = [
    { id: "AP-01", si: "FER-04310", sugiere: "FER-04101", juntas: 214, conf: 71, lift: 6.2, por: 3, nota: "3 m de cable por tubo conduit" },
    { id: "AP-02", si: "FER-01890", sugiere: "FER-01042", juntas: 132, conf: 62, lift: 2.1, por: 1 / 12, nota: "Un saco de cemento cada 12 baldosas" },
    { id: "AP-03", si: "FER-04510", sugiere: "FER-07040", juntas: 88, conf: 57, lift: 4.8, fijo: 1, nota: "Clavos con el martillo" },
    { id: "AP-04", si: "FER-03810", sugiere: "FER-07010", juntas: 96, conf: 44, lift: 5.3, por: 6, nota: "6 tornillos autorroscantes por perling" },
    { id: "AP-05", si: "FER-08010", sugiere: "FER-03004", juntas: 41, conf: 33, lift: 3.1, fijo: 1, nota: "Llave de chorro para conectar la manguera" },
    { id: "AP-06", si: "FER-07120", sugiere: "FER-01042", juntas: 23, conf: 6, lift: 0.9, fijo: 1, nota: "Coincidencia: no tiene relación de uso" }
  ].map(x => Object.assign({ estado: "Propuesta" }, x));
  const REVISION = { hora: dia(0, 2, 0), facturas: 18432, dias: 90 };
  const descDe = cod => (byCod(cod) || {}).desc || cod;
  /* aprobar un par lo suma a la regla de ese artículo, o crea la regla si no tiene */
  function aprobarAprendida(id, quien) {
    const x = APREND.find(y => y.id === id); if (!x || x.estado !== "Propuesta") return null;
    let r = reglaDe(x.si);
    if (r && r.sugeridos.length >= MAX_SUG) return { llena: r };
    const s = sug(x.sugiere, { por: x.por || null, fijo: x.fijo || null, nota: x.nota, conf: x.conf / 100, origen: "Aprendida", mostradas: 0, aceptadas: 0 });
    if (r) { r.sugeridos.push(s); r.cambio = ahora(); r.autor = quien || "Marta Rojas"; }
    else r = regla(x.si, [s], { autor: quien || "Marta Rojas", desde: ahora(), cambio: ahora() });
    x.estado = "Aprobada";
    anotar("Aprobó sugerencia de producto relacionado", descDe(x.si) + " → " + descDe(x.sugiere), quien || "Marta Rojas", "L1", "Baja");
    return { regla: r };
  }
  function descartarAprendida(id, quien) {
    const x = APREND.find(y => y.id === id); if (!x) return null;
    x.estado = "Descartada";
    anotar("Descartó sugerencia de producto relacionado", descDe(x.si) + " → " + descDe(x.sugiere), quien || "Marta Rojas", "L1", "Baja");
    return x;
  }
  /* crea o actualiza la regla de un artículo; los sugeridos que ya existían conservan su historial */
  function guardarRegla(o, quien) {
    let r = (o.id && REGLAS_REL.find(x => x.id === o.id)) || reglaDe(o.si);
    const previos = r ? r.sugeridos : [];
    const lista = o.sugeridos.slice(0, MAX_SUG).map(n => {
      const v = previos.find(p => p.cod === n.cod);
      return Object.assign(v || sug(n.cod, { mostradas: 0, aceptadas: 0, conf: 0.5 }), { por: n.por || null, fijo: n.fijo || null, nota: n.nota });
    });
    const nuevo = !r;
    if (r) Object.assign(r, { si: o.si, sugeridos: lista, activa: o.activa !== false, autor: quien || "Marta Rojas", cambio: ahora() });
    else r = regla(o.si, lista, { activa: o.activa !== false, autor: quien || "Marta Rojas", desde: ahora(), cambio: ahora() });
    anotar(nuevo ? "Creó regla de productos relacionados" : "Modificó regla de productos relacionados", descDe(o.si) + " → " + lista.length + (lista.length === 1 ? " sugerido" : " sugeridos"), quien || "Marta Rojas", "L1", "Baja");
    return r;
  }
  /* resultados del mes por vendedor: el nuevo acepta más, el experto ya lo sabía */
  const REL_VEND = [
    ["Kevin Solano", "6 años", 942, 248, 1104200], ["Marta Rojas", "12 años", 611, 98, 402800], ["Jonathan Ureña", "9 años", 704, 131, 688900],
    ["Sofía Camacho", "3 años", 820, 246, 1210400], ["Randall Mata", "4 meses", 961, 402, 1982300], ["Yeimy Picado", "7 meses", 774, 261, 1551700]
  ].map(x => ({ v: x[0], antig: x[1], mostradas: x[2], aceptadas: x[3], venta: x[4] }));
  const REL_SES = { mostradas: 0, aceptadas: 0, venta: 0, vistos: {} };
  function cantPara(s, l, b) {
    const q = s.fijo ? s.fijo : l.cant * (s.por || 1);
    return b.decimales ? Math.max(0.5, Math.ceil(q * 2) / 2) : Math.max(1, Math.ceil(q - 1e-9));
  }
  /* sugerencias para la línea elegida (en el orden de su regla) o, sin línea
     elegida, para toda la factura (las más aceptadas primero) */
  function relacionados(lineas, sel, sinContar) {
    const en = {}; lineas.forEach(l => { en[l.artId] = true; });
    const out = [], vistos = {};
    (sel ? [sel] : lineas).forEach(l => {
      const a = D.artById[l.artId]; if (!a) return;
      const r = REGLAS_REL.find(x => x.activa && x.si === a.cod); if (!r) return;
      r.sugeridos.forEach(s => {
        const b = byCod(s.cod); if (!b || en[b.id] || vistos[b.id]) return;
        vistos[b.id] = true;
        out.push({ a: b, base: a, cant: cantPara(s, l, b), motivo: s.nota, regla: r, s });
      });
    });
    if (!sel) out.sort((x, y) => y.s.conf - x.s.conf);
    const items = out.slice(0, MAX_SUG);
    const nom = x => x.desc.split(" ").slice(0, 3).join(" ").replace(/[,#×].*$/, "").trim();
    if (!sinContar) items.forEach(x => { const k = x.base.id + "|" + x.a.id; if (!REL_SES.vistos[k]) { REL_SES.vistos[k] = true; REL_SES.mostradas++; x.s.mostradas++; } });
    return { titulo: sel ? "Suele llevarse con " + nom(D.artById[sel.artId]).toLowerCase() : "Para esta factura también suelen llevar", items };
  }
  function aceptar(x) {
    REL_SES.aceptadas++; REL_SES.venta += Math.round(x.a.precio * x.cant); x.s.aceptadas++;
  }

  w.VENX = {
    PARAM, STATS, CATEGORIAS, FAMV, DESC, margenFam, descMax, VOLUMEN, CONVENIOS, descAuto,
    VE_COSTO, MIN_HIST, cambiarMinimo, bajoMinimo, AUT, BARRIDO, autorizaciones, resolver,
    HABILITADOS, TERMINALES, TURNOS, MEDIOS, EFECTIVO, CIERRES, turnoDe, turnosDe, resumen, abrir, retirar, cerrar,
    prep, consumir, revertir,
    flete, ZONA, MOTIVOS, PERDIDAS, perdidas, enviarLink, confirmarPago, marcarPerdida,
    CAP, AUTORIZADOS, alistar, asignar, entregar,
    CONCEPTOS, DESTINOS, REINTEGROS, BOLETAS, devuelto, emitirNC, aprobarBoleta,
    FICHA, vencidas, bloqueo,
    LOCVEN, COMISION, REGLAS, desempeno, MOSTRADOR, PIN, CAMBIOS_VEND,
    MAX_SUG, REGLAS_REL, reglaDe, APREND, REVISION, REL_VEND, REL_SES, relacionados, aceptar, aprobarAprendida, descartarAprendida, guardarRegla,
    pendientes, anotar, ahora, dia, esHoy, diasEntre
  };
})(window);
