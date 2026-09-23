/* ═══════════════════════════════════════════════════════════════════
   ServeCore — contabilidad automática
   El sistema registra, cruza y propone; el contador revisa lo que no
   cuadró; una persona aprueba el cierre. Aquí viven los datos de ese
   trabajo: cierres de caja, lotes del datáfono, SINPE, gastos que llegan
   por XML o por WhatsApp, ajustes de costo por ventas sin existencia,
   inventario por local, reglas de conciliación y la bandeja.
   Las cifras son de ejemplo; el comportamiento es el de producción.
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, C = w.CON, F = w.FIS, M = w.NOM;

  let _s = 20260919;
  const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const r0 = n => Math.round(n);
  const r50 = n => Math.round(n / 50) * 50;
  const HOY = D.HOY;
  const dia = n => new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - n, 18, 0);
  const pad = (n, l) => String(n).padStart(l, "0");
  /* la hora de ahora en el «hoy» del demo, para que las fechas cuadren con el resto */
  const ahora = () => { const n = new Date(); return new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), n.getHours(), n.getMinutes()); };
  const locNom = id => (D.locales.find(l => l.id === id) || {}).nom || id;

  /* ═══ 1 · QUIÉN REVISA Y QUIÉN APRUEBA ═════════════════════════════ */
  const REVISOR = { nom: "Sonia Calderón Ruiz", rol: "Contadora general" };
  const APROBADORES = [
    { nom: "Sonia Calderón Ruiz", rol: "Contadora general" },
    { nom: "Adrián Vindas Mora", rol: "Gerente general" }
  ];
  const POLITICA = {
    toleranciaCaja: 2000,          /* diferencias de caja que se registran solas */
    umbralCosto: 25000,            /* ajustes de costo que se registran solos */
    comisionDatafono: 2.75,        /* según contrato con el adquirente — parámetro */
    incobrables: [[61, 90, 5], [91, 120, 25], [121, 9999, 50]]  /* política de la empresa */
  };

  /* ═══ 2 · CUENTAS: las que usa este trabajo ya están en el catálogo único (data.js) ═══ */

  /* todo asiento automático dice qué regla lo generó */
  function asiento(fecha, origen, glosa, det, regla, aprobado) {
    const a = D.asentar(fecha, origen, glosa, det);
    a.regla = regla;
    if (aprobado) a.aprobado = aprobado;
    return a;
  }
  const BANCO = "1-01-02-001", CAJA = "1-01-01-001", INVENT = "1-01-04-001", COSTO = "5-01-01-001";

  /* ═══ 3 · BITÁCORA DE LA REVISIÓN ══════════════════════════════════ */
  const resueltos = [];
  function anotar(accion, detalle, por) {
    const p = por || REVISOR;
    const reg = { fecha: ahora(), por: p.nom, rol: p.rol, accion, detalle };
    resueltos.unshift(reg);
    if (D.bitacora) D.bitacora.unshift({
      id: "BT-C" + resueltos.length, fecha: reg.fecha, usuario: p.nom, rol: p.rol, locId: "L2",
      accion, detalle, sev: "Media", antes: "", despues: "", ip: "10.2.14.31"
    });
  }

  /* ═══ 4 · REGLAS DE CONCILIACIÓN ═══════════════════════════════════ */
  const REGLAS = [
    { id: "RG1", t: "Depósitos de caja", cond: "Local, monto exacto y fecha del cierre más un día hábil", accion: "Concilia el depósito contra su cierre de caja", origen: "Sistema", aciertos: 212, activa: true },
    { id: "RG2", t: "Liquidaciones del datáfono", cond: "Lote, fecha y monto neto de la comisión pactada", accion: "Concilia el lote y registra la comisión como gasto financiero", origen: "Sistema", aciertos: 96, activa: true },
    { id: "RG3", t: "SINPE de clientes", cond: "Monto y teléfono registrado del cliente", accion: "Aplica el cobro a la factura abierta", origen: "Sistema", aciertos: 141, activa: true },
    { id: "RG4", t: "Pagos a proveedores", cond: "Referencia del lote enviado al banco", accion: "Concilia cada transferencia contra su cuenta por pagar", origen: "Sistema", aciertos: 85, activa: true },
    { id: "RG5", t: "Planilla", cond: "Referencia del archivo de planilla", accion: "Concilia contra salarios por pagar", origen: "Sistema", aciertos: 4, activa: true },
    { id: "RG6", t: "Diferencias de caja pequeñas", cond: "Faltante o sobrante de hasta ₡2 000", accion: "Se registra solo en «Diferencias de caja»", origen: "Política de la empresa", aciertos: 9, activa: true },
    { id: "RG7", t: "Ajustes de costo pequeños", cond: "Ajuste por venta sin existencia menor a ₡25 000", accion: "Se registra solo contra el costo de ventas", origen: "Política de la empresa", aciertos: 27, activa: true },
    { id: "RG8", t: "Cargo mensual del datáfono", cond: "Descripción «CARGO POS» del Banco Nacional", accion: "Gasto financiero", origen: "Aprendida · 14 ago · Sonia Calderón Ruiz", aciertos: 7, activa: true },
    { id: "RG9", t: "Electricidad por medidor", cond: "Proveedor ICE y número de medidor", accion: "Servicios públicos del local de ese medidor", origen: "Aprendida · 2 set · Sonia Calderón Ruiz", aciertos: 14, activa: true }
  ];
  function nuevaRegla(t, cond, accion) {
    const r = { id: "RG" + (REGLAS.length + 1), t, cond, accion, origen: "Aprendida · hoy · " + REVISOR.nom, aciertos: 0, activa: true, nueva: true };
    REGLAS.push(r);
    return r;
  }

  /* ═══ 5 · CAJAS, DATÁFONO Y SINPE — últimos siete días ══════════════ */
  const CAJEROS = { L1: ["Kevin Solano", "Laura Méndez", "Pablo Rojas"], L2: ["Marta Rojas", "Andrea Brenes", "Luis Alfaro", "Sofía Chaves"],
    L3: ["Yendry Chacón", "Mario Quesada"], L4: ["Esteban Vindas", "Karla Monge"], L5: ["Diego Solano"], L6: ["Grettel Araya", "Iván Cordero"], L7: ["Josué Mora"] };
  const cierres = [], lotes = [], sinpe = [];
  D.tiendas.forEach(l => {
    const escala = { L1: 1.15, L2: 1.35, L3: 0.9, L4: 0.65, L5: 0.45, L6: 1, L7: 0.5 }[l.id] || 0.7;
    /* el día 7 solo aporta su lote: las ventas con tarjeta de ese día se liquidan igual */
    for (let d = 7; d >= 0; d--) {
      const f = dia(d);
      const dom = f.getDay() === 0 ? 0.45 : 1;                /* el domingo abren medio día */
      for (let t = 1; d < 7 && t <= l.terminales; t++) {
        const efectivo = r50(ri(900000, 2600000) * escala * dom);
        cierres.push({
          id: `CJ-${l.id}-${pad(f.getDate(), 2)}-${t}`, locId: l.id, term: t, fecha: f,
          cajero: CAJEROS[l.id][(t - 1) % CAJEROS[l.id].length], fondo: 100000,
          efectivo, contado: efectivo, dif: 0, estado: "Cuadrado"
        });
      }
      /* el lote del datáfono es lo que ese local cobró con tarjeta ese día,
         menos lo que se devolvió a la misma tarjeta */
      const delDia = x => x.locId === l.id && x.fecha.toDateString() === f.toDateString();
      const bruto = D.documentos.filter(x => delDia(x) && x.tipo !== "NC").reduce((s, x) => s + D.pagadoCon(x, "Tarjeta"), 0)
        - D.documentos.filter(x => delDia(x) && x.tipo === "NC" && x.reintegro === "A la misma tarjeta").reduce((s, x) => s + x.total, 0);
      if (bruto > 0) {
        const comision = r0(bruto * POLITICA.comisionDatafono / 100);
        lotes.push({ id: `LT-${l.id}-${pad(f.getDate(), 2)}`, locId: l.id, fecha: f, bruto, comision, neto: bruto - comision, acreditado: d > 0, estado: d > 0 ? "Conciliado" : "En tránsito" });
      }
      if (d === 7) continue;
      const n = ri(3, 11);
      sinpe.push({ locId: l.id, fecha: f, n, monto: r50(n * ri(38000, 96000)), identificados: n });
    }
  });
  /* depósitos: el efectivo de cada día se deposita al siguiente */
  const depositos = [];
  D.tiendas.forEach(l => {
    const dias = {};
    cierres.filter(c => c.locId === l.id).forEach(c => { const k = c.fecha.toDateString(); (dias[k] = dias[k] || []).push(c); });
    Object.keys(dias).forEach(k => {
      const cs = dias[k], f = cs[0].fecha;
      const monto = cs.reduce((s, c) => s + c.contado, 0);
      const hoy = f.toDateString() === dia(0).toDateString();
      depositos.push({ id: "DP-" + l.id + "-" + pad(f.getDate(), 2), locId: l.id, fecha: f, monto, llego: !hoy, estado: hoy ? "En tránsito" : "Conciliado", ref: pad(ri(10000000, 99999999), 8) });
    });
  });
  /* las excepciones que la bandeja tiene que mostrar */
  const cj = (loc, d, t) => cierres.find(c => c.locId === loc && c.term === t && c.fecha.toDateString() === dia(d).toDateString());
  const faltante = cj("L5", 1, 1);
  if (faltante) { faltante.contado -= 12500; faltante.dif = -12500; faltante.estado = "Faltante"; }
  const chico = cj("L2", 0, 3) || cj("L2", 0, 1);
  if (chico) { chico.contado -= 1500; chico.dif = -1500; chico.estado = "Dentro de tolerancia"; }
  const sobra = cj("L1", 2, 2);
  if (sobra) { sobra.contado += 1000; sobra.dif = 1000; sobra.estado = "Dentro de tolerancia"; }
  [chico, sobra].forEach(c => {
    if (!c) return;
    const m = Math.abs(c.dif), falta = c.dif < 0;
    asiento(c.fecha, "CJ-" + c.id.slice(3), (falta ? "Faltante" : "Sobrante") + " de caja dentro de tolerancia · " + locNom(c.locId) + " caja " + c.term,
      falta ? [{ cta: "6-01-06-002", debe: m, haber: 0 }, { cta: CAJA, debe: 0, haber: m }] : [{ cta: CAJA, debe: m, haber: 0 }, { cta: "6-01-06-002", debe: 0, haber: m }],
      "Diferencias de caja pequeñas");
  });
  const depPend = depositos.find(x => x.locId === "L4" && x.fecha.toDateString() === dia(2).toDateString());
  if (depPend) { depPend.llego = false; depPend.estado = "No llegó"; }
  const lotePend = lotes.find(x => x.locId === "L6" && x.fecha.toDateString() === dia(1).toDateString());
  if (lotePend) { lotePend.acreditado = false; lotePend.estado = "No acreditado"; }
  /* liquidación del lote acreditado: el banco recibe el neto, la comisión es
     gasto financiero y se cancela lo que estaba por liquidar */
  const liquidarLote = (x, fecha, por) => {
    x.asiento = asiento(fecha, x.id, "Liquidación del datáfono · " + locNom(x.locId) + " · lote " + x.id, [
      { cta: BANCO, debe: x.neto, haber: 0 },
      { cta: "6-01-06-001", debe: x.comision, haber: 0 },
      { cta: "1-01-03-004", debe: 0, haber: x.bruto }
    ], "Liquidación de lotes del datáfono", por).id;
  };
  lotes.filter(x => x.acreditado).forEach(x => liquidarLote(x, new Date(Math.min(x.fecha.getTime() + 15 * 3600000, HOY.getTime()))));
  const sinpeHoy = sinpe.find(x => x.locId === "L2" && x.fecha.toDateString() === dia(0).toDateString());
  if (sinpeHoy) sinpeHoy.identificados = sinpeHoy.n - 1;
  const sinpeAyer = sinpe.find(x => x.locId === "L5" && x.fecha.toDateString() === dia(1).toDateString());
  if (sinpeAyer) sinpeAyer.identificados = sinpeAyer.n - 1;

  /* ═══ 6 · BANCO — cada movimiento con su pareja o su sugerencia ═════ */
  const cli = i => D.clientes[i % D.clientes.length].nom;
  const fechaCorta = d => pad(d.getDate(), 2) + " " + ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"][d.getMonth()];
  /* montos creíbles para lo que el generador del demo deja al azar */
  D.banco.forEach(b => {
    if (/Comisión/.test(b.desc)) b.haber = ri(3, 45) * 850;
    else if (/Retiro/.test(b.desc)) b.haber = ri(2, 8) * 25000;
    else if (/servicios/.test(b.desc)) b.haber = ri(90000, 1400000);
  });
  const retiro = D.banco.filter(b => !b.conciliado && /Comisión/.test(b.desc))[1];
  if (retiro) { retiro.desc = "Retiro de efectivo"; retiro.haber = 150000; }
  D.banco.forEach((b, i) => {
    const antes = new Date(b.fecha.getTime() - 86400000);
    const que = /Depósito de caja (.+)/.exec(b.desc);
    if (que) b.pareja = { t: "Depósito del cierre de caja de " + que[1] + " del " + fechaCorta(antes), regla: "Depósitos de caja", conf: 98 };
    else if (/SINPE/.test(b.desc)) b.pareja = { t: "Cobro de la factura de contado de ruta de " + cli(i + 3), regla: "SINPE de clientes", conf: 91 };
    else if (/Transferencia recibida/.test(b.desc)) b.pareja = { t: "Abono de " + cli(i) + " a sus facturas a crédito", regla: "Cobros por transferencia", conf: 88 };
    else if (/datáfono/.test(b.desc)) b.pareja = { t: "Lote del datáfono del " + fechaCorta(antes) + ", neto de comisión", regla: "Liquidaciones del datáfono", conf: 96 };
    else if (/proveedor/.test(b.desc)) b.pareja = { t: "Transferencia del lote de pago a proveedores del " + fechaCorta(antes), regla: "Pagos a proveedores", conf: 99 };
    else if (/Planilla/.test(b.desc)) b.pareja = { t: "Pago de la planilla quincenal QUI-2026-17", regla: "Planilla", conf: 99 };
    else if (/servicios/.test(b.desc)) b.pareja = { t: "Factura del ICE de setiembre, ya registrada", regla: "Electricidad por medidor", conf: 86 };
    else if (/Comisión/.test(b.desc)) b.pareja = { t: null, sugerencia: "No tiene pareja: es una comisión que cobra el banco. Registrarla como gasto financiero y crear la regla para que las próximas se registren solas.", regla: null, conf: null, familia: "comision-bn", crearRegla: ["Comisiones del Banco Nacional", "Descripción «COMISION» del Banco Nacional", "Gasto financiero"] };
    else b.pareja = { t: null, sugerencia: "No tiene pareja: un retiro de efectivo sin documento. Hay que preguntar a tesorería para qué fue.", regla: null, conf: null };
    b.como = b.conciliado ? "Automático" : b.pareja.t ? "Sugerido" : "Sin pareja";
  });

  /* ═══ 7 · GASTOS — facturas electrónicas y recibos por WhatsApp ══════ */
  const GASTOS = [];
  const gasto = (o) => { GASTOS.push(Object.assign({ id: "GA" + (GASTOS.length + 1) }, o)); };
  [["L1", 486300], ["L2", 712900], ["L3", 318450], ["L6", 402100], ["CD", 1284600]].forEach((x, i) =>
    gasto({ canal: "XML", prov: "ICE · electricidad", ced: "4-000-042139", locId: x[0], monto: x[1], cta: "6-01-02-002", regla: "Electricidad por medidor", fecha: dia(i + 1), estado: "Registrado solo" }));
  gasto({ canal: "XML", prov: "AyA · agua potable", ced: "4-000-042138", locId: "L2", monto: 96400, cta: "6-01-02-002", regla: "Aprendida · 3 jul", fecha: dia(3), estado: "Registrado solo" });
  gasto({ canal: "XML", prov: "Inversiones Pacayas del Norte S.A. · alquiler", ced: "3-101-552210", locId: "L3", monto: 1850000, cta: "6-01-02-004", regla: "Aprendida · 1 ago", fecha: dia(5), estado: "Registrado solo" });
  gasto({ canal: "XML", prov: "Telecomunicaciones Cartago · internet", ced: "3-101-610944", locId: "L4", monto: 58900, cta: "6-01-02-002", regla: "Aprendida · 12 jun", fecha: dia(2), estado: "Registrado solo" });
  gasto({ canal: "XML", prov: "Alarmas y Monitoreo del Este S.A.", ced: "3-101-701233", locId: "L7", monto: 74500, cta: "6-01-02-003", conf: 82, fecha: dia(1), estado: "Por confirmar", nuevo: true,
    motivo: "Proveedor nuevo: el sistema propone «Servicios contratados» por la actividad económica del emisor." });
  gasto({ canal: "XML", prov: "Talleres Mecánicos Ramírez · reparación de camión", ced: "1-0845-0332", locId: "CD", monto: 386000, cta: "6-01-02-005", conf: 90, fecha: dia(1), estado: "Por confirmar", nuevo: true,
    motivo: "Proveedor nuevo: la factura menciona la placa de un camión de la flota, por eso propone «Mantenimiento y reparaciones»." });
  gasto({ canal: "WhatsApp", prov: "Taxi Pejibaye → Turrialba", enviado: "Diego Solano · Pejibaye", locId: "L5", monto: 6500, cta: "6-01-02-001", conf: 94, fecha: dia(0), estado: "Por confirmar",
    motivo: "Foto del recibo enviada por WhatsApp. Leyó monto, fecha y placa del taxi; propone «Combustible y transporte» con caja chica." });
  gasto({ canal: "WhatsApp", prov: "Candado y cadena para portón de bodega", enviado: "Josué Mora · Tucurrique", locId: "L7", monto: 8900, cta: "6-01-02-005", conf: 87, fecha: dia(1), estado: "Por confirmar",
    motivo: "Foto del tiquete de un comercio sin factura electrónica. Propone «Mantenimiento y reparaciones» con caja chica." });
  gasto({ canal: "WhatsApp", prov: "Parqueo por trámite en San José", enviado: "Adrián Vindas Mora · Gerencia", locId: "L2", monto: 2500, cta: "6-01-02-001", conf: 78, fecha: dia(2), estado: "Por confirmar",
    motivo: "Foto del comprobante del parqueo. Propone «Combustible y transporte» con caja chica." });
  function asentarGasto(g) {
    /* el XML trae el IVA; servicios comerciales (luz, agua, alquiler, internet) van al 13 % */
    const iva = g.canal === "XML" ? D.ivaIncluido(g.monto, g.tarifa == null ? 13 : g.tarifa) : 0;
    const det = [{ cta: g.cta, debe: g.monto - iva, haber: 0 }];
    if (iva) det.push({ cta: "1-01-05-001", debe: iva, haber: 0 });
    det.push({ cta: g.canal === "XML" ? "2-01-01-001" : "1-01-01-001", debe: 0, haber: g.monto });
    const a = D.asentar(g.fecha, (g.canal === "XML" ? "GAS-" : "WA-") + g.id, g.prov + " · " + locNom(g.locId), det);
    a.regla = g.canal === "XML" ? "Gasto por proveedor" : "Recibo por WhatsApp";
    g.asiento = a.id;
  }
  GASTOS.filter(g => g.estado === "Registrado solo").forEach(asentarGasto);

  /* ═══ 8 · AJUSTES DE COSTO — ventas hechas sin existencia ═══════════ */
  const prods = D.articulos.filter(a => a.tipo === "Producto");
  const AJUSTES = [];
  [[0, "L3", 40, 0.034], [1, "L2", 120, 0.052], [7, "L5", 180, 0.041], [8, "L1", 350, 0.021], [3, "L6", 12, -0.028], [12, "L4", 25, 0.018], [20, "L7", 14, 0.045], [15, "L2", 30, -0.015], [0, "L6", 150, 0.062]]
    .forEach((x, i) => {
      const a = prods[x[0] % prods.length];
      const real = r0(a.costo * (1 + x[3]));
      const ajuste = (real - a.costo) * x[2];
      AJUSTES.push({
        id: "AC" + (i + 1), art: a, locId: x[1], unidades: x[2], costoUsado: a.costo, costoReal: real, ajuste,
        fecha: dia(ri(0, 5)), estado: Math.abs(ajuste) < POLITICA.umbralCosto ? "Registrado solo" : "Por revisar"
      });
    });

  function asentarAjuste(a, aprobado) {
    const m = Math.abs(a.ajuste), sube = a.ajuste > 0;
    const as = asiento(a.fecha, "AJC-" + a.id, "Ajuste de costo por venta sin existencia · " + a.art.desc + " · " + locNom(a.locId),
      sube ? [{ cta: COSTO, debe: m, haber: 0 }, { cta: INVENT, debe: 0, haber: m }] : [{ cta: INVENT, debe: m, haber: 0 }, { cta: COSTO, debe: 0, haber: m }],
      "Ajustes de costo pequeños", aprobado);
    a.asiento = as.id;
  }
  AJUSTES.filter(a => a.estado === "Registrado solo" && a.ajuste).forEach(a => asentarAjuste(a));

  /* ═══ 9 · INVENTARIO POR LOCAL ═════════════════════════════════════ */
  const INV = D.locales.map(l => {
    let kardex = 0;
    D.articulos.forEach(a => { const e = (D.existencias[a.id] || {})[l.id]; if (e && e.cant > 0) kardex += e.cant * a.costo; });
    return { loc: l, kardex: r0(kardex), libro: r0(kardex), causa: null, estado: "Cuadra" };
  });
  const inv = id => INV.find(x => x.loc.id === id);
  if (inv("L3")) Object.assign(inv("L3"), { libro: inv("L3").kardex + 84300, estado: "Diferencia",
    causa: "Merma de 3 esmaltes anticorrosivos registrada en el kardex; el asiento quedó retenido porque la foto de evidencia no se adjuntó." });
  if (inv("B1")) Object.assign(inv("B1"), { libro: inv("B1").kardex - 27900, estado: "Diferencia",
    causa: "Traslado recibido del CEDI con el flete incluido en el costo del kardex pero no en el asiento del traslado." });

  /* ═══ 10 · CARTERA Y PROVEEDORES ═══════════════════════════════════ */
  function cartera() {
    const docs = D.documentos.filter(d => d.saldo > 0);
    const aux = docs.reduce((s, d) => s + d.saldo, 0);
    const libro = C.saldoDe(D.ctaByCod["1-01-03-001"]);
    /* la antigüedad se mide desde el vencimiento (fecha + plazo del cliente), no desde la emisión */
    const vencida = d => Math.round((HOY - d.fecha) / 86400000) - ((D.cliById[d.clienteId] || {}).plazo || 30);
    const tramos = [[-9999, 0, "Al día"], [1, 30, "1 a 30 días vencida"], [31, 60, "31 a 60 días vencida"], [61, 90, "61 a 90 días vencida"], [91, 9999, "Más de 90 días vencida"]]
      .map(t => {
        const s = docs.filter(d => { const x = vencida(d); return x >= t[0] && x <= t[1]; }).reduce((a, d) => a + d.saldo, 0);
        const pol = POLITICA.incobrables.find(p => t[0] >= p[0] && t[0] <= p[1]);
        return { t: t[2], saldo: s, pct: pol ? pol[2] : 0, estimacion: r0(s * (pol ? pol[2] : 0) / 100) };
      });
    return { aux, libro, diferencia: libro - aux, tramos, estimacion: tramos.reduce((s, t) => s + t.estimacion, 0) };
  }
  function proveedores() {
    /* lo que se le debe a cada proveedor (facturas, compras aplicadas y comprobantes aceptados) más los gastos por XML */
    const aux = D.proveedores.reduce((s, p) => s + p.saldo, 0) + GASTOS.filter(g => g.canal === "XML" && g.asiento).reduce((s, g) => s + g.monto, 0);
    const libro = C.saldoDe(D.ctaByCod["2-01-01-001"]);
    return { aux, libro, diferencia: libro - aux };
  }

  /* ═══ 11 · FIN DE MES — lo que el sistema dejó propuesto ═══════════ */
  const origenDe = pref => D.asientos.find(a => a.origen.indexOf(pref) === 0);
  const asDep = origenDe("DEP-"), asPro = origenDe("PRO-");
  [asDep, asPro].forEach(a => { if (a) { a.propuesto = true; a.regla = /^DEP/.test(a.origen) ? "Depreciación mensual" : "Provisiones laborales"; } });
  const sumaDebe = a => (a ? a.detalle.reduce((s, x) => s + (x.debe || 0), 0) : 0);
  const FINMES = [
    { id: "FM1", t: "Depreciación de setiembre", d: "Línea recta, tasas del reglamento, " + C.ACTIVOS.length + " activos", monto: sumaDebe(asDep), asiento: asDep && asDep.id, estado: "Propuesto" },
    { id: "FM2", t: "Provisiones laborales de setiembre", d: "Aguinaldo, vacaciones y cesantía sobre la planilla del mes", monto: sumaDebe(asPro), asiento: asPro && asPro.id, estado: "Propuesto" },
    { id: "FM3", t: "IVA diferido con más de 90 días", d: "Ventas a crédito sin cobrar a los 90 días: el IVA se declara igual este mes", monto: F ? F.ivaMes().diferidoVencido : 0, estado: "Propuesto",
      det: m => [{ cta: "2-01-02-002", debe: m, haber: 0 }, { cta: "2-01-02-001", debe: 0, haber: m }] },
    { id: "FM4", t: "Estimación por incobrables", d: "Según la antigüedad de la cartera y la política de la empresa", monto: 0, estado: "Propuesto",
      det: m => [{ cta: "6-01-04-002", debe: m, haber: 0 }, { cta: "1-01-03-002", debe: 0, haber: m }] },
    { id: "FM5", t: "Diferencial cambiario", d: "Sin saldos en dólares al cierre de setiembre", monto: 0, estado: "Sin movimiento" }
  ];
  FINMES[3].monto = cartera().estimacion;

  /* ═══ 12 · IMPUESTOS — borradores que presenta una persona ══════════ */
  const trimestre = ids => C.porLocal().filter(r => ids.indexOf(r.loc.id) >= 0).reduce((s, r) => s + r.venta, 0) * 3;
  const iva = F ? F.ivaMes() : { debitoContado: 0, debitoREP: 0, diferidoVencido: 0, creditoFiscal: 0, aPagar: 0, docs: 0 };
  const ret = M ? M.activos().map(e => M.renta(e.salario, e.hijos, e.conyuge).retener) : [];
  const patente = (id, canton, locs, nombres) => {
    const base = trimestre(locs);
    return { id, t: "Patente municipal · " + canton, ent: "Municipalidad de " + canton, periodo: "tercer trimestre", vence: "30 set 2026",
      monto: r0(base * 0.003), estado: "Borrador listo", origen: "Ventas del trimestre de " + nombres,
      lineas: [["Ventas del trimestre de " + nombres, base], ["Tarifa de ejemplo 0,3 % — la real la fija cada municipalidad", null], ["Patente del trimestre", r0(base * 0.003)]] };
  };
  const IMPUESTOS = [
    { id: "TX1", t: "Declaración del IVA · formulario 150", ent: "Hacienda · TRIBU-CR", periodo: "setiembre 2026", vence: "15 oct 2026",
      monto: iva.aPagar, estado: "Borrador listo", origen: iva.docs + " comprobantes emitidos y los recibidos del mes",
      lineas: [["IVA de ventas de contado", iva.debitoContado], ["IVA de ventas a crédito cobradas (REP)", iva.debitoREP], ["IVA diferido que cumplió 90 días", iva.diferidoVencido],
        ["Menos: crédito fiscal de compras aceptadas", -iva.creditoFiscal], ["IVA a pagar", iva.aPagar]] },
    { id: "TX2", t: "Retenciones del impuesto al salario · formulario 138", ent: "Hacienda · TRIBU-CR", periodo: "setiembre 2026", vence: "15 oct 2026",
      monto: ret.reduce((a, b) => a + b, 0), estado: "Borrador listo", origen: "Planillas pagadas en el mes",
      lineas: [["Colaboradores en planilla", ret.length], ["Colaboradores con retención", ret.filter(x => x > 0).length], ["Impuesto retenido en el mes", ret.reduce((a, b) => a + b, 0)]] },
    { id: "TX3", t: "Segundo pago parcial del impuesto sobre la renta", ent: "Hacienda · TRIBU-CR", periodo: "2026", vence: "30 set 2026",
      monto: 17100000, estado: "Borrador listo", origen: "25 % del impuesto del período anterior",
      lineas: [["Impuesto sobre la renta del período 2025 (dato de ejemplo)", 68400000], ["Pago parcial: 25 %", 17100000]] },
    patente("TX4", "Turrialba", ["L1", "L2", "L6"], "Santa Rosa, Turrialba y El Centro"),
    patente("TX5", "Alvarado", ["L3", "L4"], "Pacayas y Cervantes"),
    patente("TX6", "Jiménez", ["L5", "L7"], "Pejibaye y Tucurrique")
  ];

  /* ═══ 13 · LA BANDEJA ══════════════════════════════════════════════
     Todo lo que el sistema no pudo resolver solo. Cada asunto trae la
     causa probable, lo que el sistema sugiere y las salidas posibles.
     Resolver cambia el dato de verdad: concilia el banco, registra el
     gasto, aprueba el asiento. Nada queda en firme sin un nombre.       */
  const ACC = {
    aceptar: { t: "Aceptar" },
    regla: { t: "Aceptar y crear regla" },
    consultar: { t: "Pedir explicación" }
  };
  const GRUPOS = [
    { id: "banco", t: "Banco", ic: "bank", ir: "con-conciliaciones|banco" },
    { id: "caja", t: "Cajas, datáfono y SINPE", ic: "cash", ir: "con-conciliaciones|caja" },
    { id: "inventario", t: "Inventario y costo", ic: "box", ir: "con-conciliaciones|inventario" },
    { id: "compras", t: "Compras y comprobantes de proveedor", ic: "truck", ir: "fel-recibidos" },
    { id: "gastos", t: "Gastos por confirmar", ic: "file", ir: "con-reglas|cuentas" },
    { id: "finmes", t: "Fin de mes", ic: "calc", ir: "con-cierre|cierre" },
    { id: "cierre", t: "Observaciones de quien aprueba", ic: "lock", ir: "con-cierre|cierre" }
  ];
  const items = [];
  const add = o => items.push(Object.assign({ estado: "Pendiente", acciones: ["aceptar", "consultar"] }, o));

  D.banco.filter(b => !b.conciliado).forEach(b => {
    const p = b.pareja;
    add({
      id: "BN-" + b.id, grupo: "banco", k: p.t ? "wa" : "cr", ic: "bank",
      t: b.desc + (p.t ? "" : " sin pareja en los libros"),
      d: "Banco Nacional · " + (b.debe ? "entrada" : "salida") + " del " + fechaCorta(b.fecha) + " · referencia " + b.ref,
      monto: b.debe || b.haber, sugerencia: p.t || p.sugerencia, conf: p.conf,
      acciones: p.t ? ["aceptar", "consultar"] : p.crearRegla ? ["regla", "consultar"] : ["consultar", "aceptar"],
      aceptarTexto: p.t ? "Aceptar el cruce" : p.crearRegla ? "Registrar como gasto" : "Registrar como caja chica",
      reglaNueva: p.crearRegla, familia: p.familia, resp: "Tesorería",
      hacer: () => {
        b.conciliado = true; b.como = p.t ? "Aprobado" : "Registrado";
        if (!p.t) asiento(b.fecha, "BCO-" + b.ref, b.desc + " · Banco Nacional",
          /Comisión/.test(b.desc) ? [{ cta: "6-01-06-001", debe: b.haber, haber: 0 }, { cta: BANCO, debe: 0, haber: b.haber }]
            : [{ cta: CAJA, debe: b.haber, haber: 0 }, { cta: BANCO, debe: 0, haber: b.haber }],
          /Comisión/.test(b.desc) ? "Comisiones del Banco Nacional" : "Registro manual aprobado", REVISOR.nom);
      }
    });
  });
  if (faltante) add({
    id: "CJ-FALT", grupo: "caja", k: "cr", ic: "cash", t: "Faltante de ₡12 500 en la caja 1 de Pejibaye",
    d: "Cierre del " + fechaCorta(faltante.fecha) + " · cajero " + faltante.cajero, monto: 12500,
    sugerencia: "Pasa del tope de tolerancia de ₡2 000. Registrarlo como cuenta por cobrar al cajero, según el reglamento de cajas.", conf: null,
    aceptarTexto: "Cargar al cajero", resp: faltante.cajero,
    hacer: () => {
      faltante.estado = "Cargado al cajero";
      asiento(HOY, "CJ-" + faltante.id.slice(3), "Faltante de caja cargado a " + faltante.cajero + " · Pejibaye caja 1",
        [{ cta: "1-01-03-003", debe: 12500, haber: 0 }, { cta: CAJA, debe: 0, haber: 12500 }], "Faltantes de caja", REVISOR.nom);
    }
  });
  if (depPend) add({
    id: "CJ-DEP", grupo: "caja", k: "cr", ic: "cash", t: "El depósito de Cervantes del " + fechaCorta(depPend.fecha) + " no llegó al banco",
    d: "Esperado el día siguiente por ₡" + String(depPend.monto).replace(/\B(?=(\d{3})+(?!\d))/g, " "), monto: depPend.monto,
    sugerencia: "Revisar con la encargada del local si el depósito se hizo. Mientras tanto queda como efectivo en tránsito.", conf: null,
    acciones: ["consultar", "aceptar"], aceptarTexto: "Llegó: conciliar", resp: "Karla Monge · Cervantes",
    hacer: () => { depPend.llego = true; depPend.estado = "Conciliado"; }
  });
  if (lotePend) add({
    id: "CJ-LOTE", grupo: "caja", k: "wa", ic: "card", t: "El lote del datáfono de El Centro del " + fechaCorta(lotePend.fecha) + " no se acreditó",
    d: "Bruto ₡" + String(lotePend.bruto).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " · neto esperado ₡" + String(lotePend.neto).replace(/\B(?=(\d{3})+(?!\d))/g, " "), monto: lotePend.neto,
    sugerencia: "El adquirente suele acreditar en 24 a 48 horas. Si mañana no aparece, se reclama con el número de lote.", conf: null,
    aceptarTexto: "Esperar un día más", resp: "Adquirente del datáfono",
    hacer: () => { lotePend.estado = "En espera aprobada"; }
  });
  [["L2", 0, 48500, "Coopeagri R.L.", 94], ["L5", 1, 126000, "Finca La Esperanza S.R.L.", 89]].forEach((x, i) => add({
    id: "SP-" + i, grupo: "caja", k: "wa", ic: "phone", t: "SINPE de ₡" + String(x[2]).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " sin identificar en " + locNom(x[0]),
    d: fechaCorta(dia(x[1])) + " · sin descripción · teléfono no registrado", monto: x[2],
    sugerencia: "Coincide en monto con la factura de contado de ruta de " + x[3] + " de ese día.", conf: x[4],
    acciones: ["aceptar", "regla", "consultar"], aceptarTexto: "Aplicar a esa factura", resp: "Encargado de " + locNom(x[0]),
    reglaNueva: ["SINPE de " + x[3], "Teléfono del SINPE de hoy, registrado a " + x[3], "Aplica el cobro a su factura abierta"],
    hacer: () => { const s = sinpe.find(y => y.locId === x[0] && y.fecha.toDateString() === dia(x[1]).toDateString()); if (s) s.identificados = s.n; }
  }));
  INV.filter(x => x.estado === "Diferencia").forEach(x => add({
    id: "INV-" + x.loc.id, grupo: "inventario", k: "wa", ic: "box", t: "Inventario de " + x.loc.nom + ": el kardex y el libro difieren en ₡" + String(Math.abs(x.libro - x.kardex)).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    d: "Cruce de anoche · kardex valorizado contra la cuenta de inventario del local", monto: Math.abs(x.libro - x.kardex),
    sugerencia: x.causa, conf: null, aceptarTexto: x.loc.id === "L3" ? "Aprobar la merma" : "Aceptar el ajuste", resp: "Encargado de bodega de " + x.loc.nom,
    hacer: () => {
      const m = Math.abs(x.libro - x.kardex), merma = x.libro > x.kardex;
      asiento(HOY, "INV-" + x.loc.id, (merma ? "Merma aprobada · " : "Flete capitalizado al inventario · ") + x.loc.nom,
        merma ? [{ cta: "6-01-03-001", debe: m, haber: 0 }, { cta: INVENT, debe: 0, haber: m }] : [{ cta: INVENT, debe: m, haber: 0 }, { cta: "6-01-02-001", debe: 0, haber: m }],
        "Cruce diario de inventario", REVISOR.nom);
      x.libro = x.kardex; x.estado = "Ajustado";
    }
  }));
  AJUSTES.filter(a => a.estado === "Por revisar").forEach(a => add({
    id: "AJ-" + a.id, grupo: "inventario", k: "in", ic: "calc", t: "Ajuste de costo de ₡" + String(Math.abs(a.ajuste)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " · " + a.art.desc,
    d: a.unidades + " unidades vendidas sin existencia en " + locNom(a.locId) + " · costo usado ₡" + a.costoUsado + ", costo real de la compra ₡" + a.costoReal, monto: Math.abs(a.ajuste),
    sugerencia: "El costo promedio se recalculó con la compra que entró, con la existencia negativa en cero como pide Santa Rosa. Pasa del umbral de ₡25 000, por eso pide revisión.", conf: null,
    aceptarTexto: "Aprobar el ajuste", resp: "Compras",
    hacer: () => { a.estado = "Aprobado"; asentarAjuste(a, REVISOR.nom); }
  }));
  const sinAceptar = () => D.recibidos.filter(r => r.estado === "Sin aceptar");
  add({
    id: "CO-OC", grupo: "compras", k: "cr", ic: "file", t: "Comprobantes de proveedor que cruzan con su orden de compra",
    d: "Se aceptan ante Hacienda con un solo toque; vencido el plazo, el crédito fiscal se pierde", monto: null,
    cuenta: () => sinAceptar().filter(r => r.ocLigada).length,
    sugerencia: "Cruzan en proveedor, monto y líneas contra la orden y la recepción. Aceptarlos todos.", conf: 99,
    acciones: ["aceptar"], aceptarTexto: "Aceptar ante Hacienda",
    hacer: () => { if (F) F.aceptarRecibidos(); else sinAceptar().filter(r => r.ocLigada).forEach(r => (r.estado = "Aceptado")); }
  });
  add({
    id: "CO-SIN", grupo: "compras", k: "wa", ic: "file", t: "Comprobantes de proveedor sin orden de compra",
    d: "Compras hechas sin orden: hay que confirmar que la mercadería entró antes de aceptarlas", monto: null,
    cuenta: () => sinAceptar().filter(r => !r.ocLigada).length,
    sugerencia: "El sistema los cruzó con las recepciones de bodega y todos tienen entrada registrada. Se pueden aceptar.", conf: 84,
    aceptarTexto: "Aceptar ante Hacienda", resp: "Encargado de compras",
    hacer: () => { sinAceptar().forEach(r => (r.estado = "Aceptado")); }
  });
  const oc = D.compras.find(x => x.estado === "Registrada");
  if (oc) add({
    id: "CO-RF", grupo: "compras", k: "in", ic: "truck", t: "Mercadería recibida sin factura del proveedor · " + oc.cons,
    d: D.provById[oc.provId].nom + " · recibida en " + locNom(oc.locId) + " · ₡" + String(oc.total).replace(/\B(?=(\d{3})+(?!\d))/g, " "), monto: oc.total,
    sugerencia: "Queda en «Mercadería recibida por facturar» hasta que llegue el XML; cuando llegue, se cruza solo.", conf: null,
    acciones: ["aceptar", "consultar"], aceptarTexto: "Dejar en espera de la factura", resp: D.provById[oc.provId].nom,
    hacer: () => { oc.esperaFactura = true; }
  });
  GASTOS.filter(g => g.estado === "Por confirmar").forEach(g => add({
    id: "GA-" + g.id, grupo: "gastos", k: "in", ic: g.canal === "WhatsApp" ? "chat" : "file",
    t: (g.canal === "WhatsApp" ? "Recibo por WhatsApp · " : "Factura de proveedor nuevo · ") + g.prov,
    d: (g.enviado ? "Enviado por " + g.enviado + " · " : locNom(g.locId) + " · ") + "₡" + String(g.monto).replace(/\B(?=(\d{3})+(?!\d))/g, " "), monto: g.monto,
    sugerencia: g.motivo + " Cuenta: " + ((D.ctaByCod[g.cta] || {}).nom || g.cta) + ".", conf: g.conf,
    acciones: g.canal === "XML" ? ["regla", "aceptar", "consultar"] : ["aceptar", "consultar"],
    aceptarTexto: "Registrar", reglaNueva: g.canal === "XML" ? [g.prov.split(" · ")[0], "Emisor " + g.ced, "Siempre a «" + (D.ctaByCod[g.cta] || {}).nom + "»"] : null,
    resp: g.enviado ? g.enviado.split(" · ")[0] : "Compras",
    hacer: () => { g.estado = "Registrado"; asentarGasto(g); }
  }));
  FINMES.filter(f => f.estado === "Propuesto").forEach(f => add({
    id: "FM-" + f.id, grupo: "finmes", k: "in", ic: "calc", t: f.t, d: f.d, monto: f.monto,
    sugerencia: f.asiento ? "El asiento ya se generó el día 1 y espera su aprobación: " + f.asiento + "." : "El sistema preparó el asiento; se registra al aprobarlo.", conf: null,
    acciones: ["aceptar"], aceptarTexto: "Aprobar el asiento",
    hacer: () => {
      f.estado = "Aprobado";
      const a = f.asiento && D.asientos.find(x => x.id === f.asiento);
      if (a) { a.propuesto = false; a.aprobado = REVISOR.nom; }
      else if (f.det && f.monto) { const n = D.asentar(HOY, "CIE-" + f.id, f.t, f.det(f.monto)); n.regla = "Cierre de mes"; n.aprobado = REVISOR.nom; f.asiento = n.id; }
    }
  }));

  function bandeja(incluirResueltos) {
    return items.filter(it => incluirResueltos || it.estado !== "Resuelto")
      .filter(it => !it.cuenta || it.cuenta() > 0 || it.estado === "Resuelto");
  }
  function resolver(id, accion) {
    const it = items.find(x => x.id === id);
    if (!it || it.estado === "Resuelto") return null;
    if (accion === "consultar") {
      it.estado = "En consulta";
      anotar("Pidió explicación", it.t + " · a " + (it.resp || "responsable"));
      return it;
    }
    it.hacer();
    it.estado = "Resuelto";
    it.como = accion === "regla" ? "Aceptado y convertido en regla" : (it.aceptarTexto || "Aceptado");
    it.por = REVISOR.nom;
    let regla = null;
    if (accion === "regla" && it.reglaNueva) {
      regla = nuevaRegla(it.reglaNueva[0], it.reglaNueva[1], it.reglaNueva[2]);
      regla.aciertos = 1;
      /* la regla nueva se aplica en el acto a lo que ya estaba esperando */
      it.aplicadas = 0;
      if (it.familia) items.filter(x => x !== it && x.familia === it.familia && x.estado !== "Resuelto").forEach(x => {
        x.hacer(); x.estado = "Resuelto"; x.como = "Resuelto por la regla «" + regla.t + "»"; x.por = "Sistema";
        regla.aciertos++; it.aplicadas++;
      });
      it.regla = regla;
    }
    anotar(it.como, it.t + (regla ? " · regla «" + regla.t + "»" : ""));
    return it;
  }
  function resolverGrupo(grupo) {
    let n = 0;
    items.filter(it => it.grupo === grupo && it.estado !== "Resuelto" && it.acciones.indexOf("aceptar") >= 0 && (it.conf >= 85 || it.grupo === "finmes"))
      .forEach(it => { resolver(it.id, "aceptar"); n++; });
    return n;
  }

  /* lo que el sistema hizo solo desde anoche — para que se vea */
  function hechoSolo() {
    const hoy = D.documentos.filter(d => d.fecha.toDateString() === HOY.toDateString()).length;
    return [
      { n: D.asientos.filter(a => !a.propuesto && !a.aprobado && a.origen !== "APERTURA" && a.fecha.getMonth() === HOY.getMonth()).length, t: "asientos registrados solos en el mes" },
      { n: hoy, t: "facturas de hoy con su asiento y su costo" },
      { n: depositos.filter(x => x.estado === "Conciliado").length, t: "depósitos de caja conciliados" },
      { n: lotes.filter(x => x.estado === "Conciliado").length, t: "lotes del datáfono conciliados" },
      { n: sinpe.reduce((s, x) => s + x.identificados, 0), t: "SINPE aplicados a su factura" },
      { n: GASTOS.filter(g => g.estado === "Registrado solo").length, t: "gastos registrados desde su XML" },
      { n: AJUSTES.filter(a => a.estado === "Registrado solo").length, t: "ajustes de costo pequeños" }
    ];
  }

  /* ═══ 14 · LA LISTA DE CIERRE ══════════════════════════════════════
     Cada punto se mide solo. El último lo da una persona.               */
  const pend = g => items.filter(it => it.grupo === g && it.estado !== "Resuelto" && (!it.cuenta || it.cuenta() > 0)).length;
  function listaCierre() {
    const s = C.situacion();
    return [
      { t: "Banco conciliado", d: pend("banco") ? pend("banco") + " movimientos por revisar" : "Todo movimiento tiene su pareja", ok: !pend("banco"), ir: "con-conciliaciones|banco" },
      { t: "Cajas, datáfono y SINPE cuadrados", d: pend("caja") ? pend("caja") + " diferencias por revisar" : "Cada cierre de caja tiene su depósito", ok: !pend("caja"), ir: "con-conciliaciones|caja" },
      { t: "Inventario y costos revisados", d: pend("inventario") ? pend("inventario") + " diferencias o ajustes por revisar" : "El kardex y el libro cuadran en cada local", ok: !pend("inventario"), ir: "con-conciliaciones|inventario" },
      { t: "Compras y comprobantes de proveedor", d: pend("compras") ? "Comprobantes o recepciones por resolver" : "Todo comprobante aceptado ante Hacienda", ok: !pend("compras"), ir: "contabilidad" },
      { t: "Gastos confirmados", d: pend("gastos") ? pend("gastos") + " gastos por confirmar" : "Todo gasto registrado con su cuenta", ok: !pend("gastos"), ir: "contabilidad" },
      { t: "Asientos de fin de mes aprobados", d: pend("finmes") ? pend("finmes") + " asientos propuestos sin aprobar" : "Depreciación, provisiones, IVA diferido e incobrables", ok: !pend("finmes"), ir: "contabilidad" },
      (() => { const dk = cartera().diferencia, dp = proveedores().diferencia; return { t: "Cartera y proveedores cuadrados", d: !dk && !dp ? "Los auxiliares cuadran con su cuenta" : "Diferencia: clientes ₡" + dk + " · proveedores ₡" + dp, ok: !dk && !dp, ir: "con-conciliaciones|cartera" }; })(),
      { t: "Balance de comprobación cuadrado", d: "Debe igual haber en todo el período", ok: s.cuadra, ir: "con-libros|saldos" },
      { t: "Borradores de impuestos listos", d: "IVA, retenciones y patentes prellenados", ok: true, ir: "con-cierre|impuestos" }
    ].concat(items.some(it => it.grupo === "cierre")
      ? [{ t: "Observaciones de la aprobación atendidas", d: pend("cierre") ? "Quien aprueba devolvió el cierre con una observación" : "Atendidas", ok: !pend("cierre"), ir: "contabilidad" }] : []);
  }

  /* ═══ 15 · EL CIERRE — lo envía el contador, lo aprueba una persona ═══
     «En revisión» → «Enviado a aprobación» → «Cerrado», o «Devuelto» con
     una observación que cae en la bandeja del contador.                  */
  const mesAbierto = () => C.cierres.find(x => !x.bloqueado);
  const CIERRE = { estado: "En revisión", historial: [] };
  function hito(t, persona, nota) {
    CIERRE.historial.unshift({ fecha: ahora(), por: persona.nom, rol: persona.rol, t, nota: nota || "" });
    anotar(t, (mesAbierto() || {}).nom + (nota ? " · " + nota : ""), persona);
  }
  function enviarAprobacion(nota) {
    if (CIERRE.estado === "Enviado a aprobación" || listaCierre().some(x => !x.ok)) return false;
    CIERRE.estado = "Enviado a aprobación"; CIERRE.enviado = ahora(); CIERRE.nota = nota || "";
    hito("Envió el cierre a aprobación", REVISOR, nota);
    return true;
  }
  function aprobarCierre(persona, nota) {
    const m = mesAbierto();
    if (!m || CIERRE.estado !== "Enviado a aprobación") return null;
    m.asientos = D.asientos.filter(a => a.fecha.getMonth() === m.mes && a.fecha.getFullYear() === 2026).length;
    Object.assign(m, { estado: "Cerrado", bloqueado: true, cerrado: ahora(), por: persona.nom, rol: persona.rol, nota: nota || "", revisado: REVISOR.nom });
    CIERRE.estado = "Cerrado"; CIERRE.aprobado = { por: persona.nom, rol: persona.rol, fecha: m.cerrado, nota: nota || "" };
    hito("Aprobó el cierre", persona, nota);
    if (m.mes < 11) C.cierres.unshift({ mes: m.mes + 1, nom: C.MESES[m.mes + 1] + " 2026", asientos: 0, estado: "Abierto", cerrado: null, por: null, bloqueado: false });
    return m;
  }
  function devolverCierre(persona, nota) {
    if (CIERRE.estado !== "Enviado a aprobación") return false;
    CIERRE.estado = "Devuelto";
    hito("Devolvió el cierre al contador", persona, nota);
    add({
      id: "DV-" + CIERRE.historial.length, grupo: "cierre", k: "cr", ic: "lock",
      t: persona.nom.split(" ")[0] + " devolvió el cierre de " + ((mesAbierto() || {}).nom || "") + " con una observación",
      d: persona.rol + " · " + (nota || "sin comentario"), monto: null,
      sugerencia: "Atender la observación. Al marcarla como atendida, el cierre se puede volver a enviar a aprobación.", conf: null,
      acciones: ["aceptar"], aceptarTexto: "Marcar como atendida",
      hacer: () => { CIERRE.estado = "En revisión"; }
    });
    return true;
  }

  /* ═══ 16 · IMPUESTOS — el contador revisa, una persona presenta ═══════ */
  function revisarImpuesto(id) {
    const x = IMPUESTOS.find(t => t.id === id);
    if (!x || x.estado !== "Borrador listo") return null;
    x.estado = "Revisado"; x.revisado = { por: REVISOR.nom, fecha: ahora() };
    anotar("Revisó el borrador", x.t + " · " + x.periodo);
    return x;
  }
  function presentarImpuesto(id, persona) {
    const x = IMPUESTOS.find(t => t.id === id);
    if (!x || x.estado !== "Revisado") return null;
    x.estado = "Presentado"; x.presentado = { por: persona.nom, rol: persona.rol, fecha: ahora(), comprobante: (/Municipalidad/.test(x.ent) ? "MUN-" : "TC-") + pad(ri(1000000, 9999999), 9) };
    anotar("Presentó la declaración", x.t + " · comprobante " + x.presentado.comprobante, persona);
    return x;
  }

  w.AUTO = {
    REVISOR, APROBADORES, POLITICA, REGLAS, nuevaRegla, GRUPOS, ACC,
    cierres, lotes, sinpe, depositos, GASTOS, AJUSTES, INV, FINMES, IMPUESTOS,
    cartera, proveedores, bandeja, resolver, resolverGrupo, hechoSolo, listaCierre, resueltos, anotar,
    items, CIERRE, mesAbierto, enviarAprobacion, aprobarCierre, devolverCierre, revisarImpuesto, presentarImpuesto
  };
})(window);
